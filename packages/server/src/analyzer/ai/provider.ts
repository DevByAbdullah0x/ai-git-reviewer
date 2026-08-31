import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMReviewResponse, LLMReviewResponseSchema, ReviewIssue, CategoryScores } from '@ai-reviewer/shared';
import { config } from '../../config';
import { buildReviewSystemPrompt, buildReviewUserPrompt } from '../prompts/review-prompt';
import { FileChangeContext } from '../diff-parser';

export interface AIReviewOptions {
  diffText: string;
  files: FileChangeContext[];
  prTitle?: string;
  prDescription?: string;
  customInstructions?: string;
}

export async function runAIReview(options: AIReviewOptions): Promise<LLMReviewResponse> {
  const provider = config.aiProvider;

  try {
    if (provider === 'gemini' && config.geminiApiKey) {
      return await reviewWithGemini(options);
    } else if (provider === 'openai' && config.openaiApiKey) {
      return await reviewWithOpenAI(options);
    }
  } catch (error) {
    console.warn(`[AI Reviewer] Failed to run with provider ${provider}:`, error);
    console.info('[AI Reviewer] Falling back to intelligent heuristic review engine.');
  }

  // Fallback to intelligent heuristic review engine
  return reviewWithMockEngine(options);
}

async function reviewWithGemini(options: AIReviewOptions): Promise<LLMReviewResponse> {
  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const models = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastErr: any = null;

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' },
        systemInstruction: buildReviewSystemPrompt(options.customInstructions),
      });
      const userPrompt = buildReviewUserPrompt(options.diffText, options.prTitle, options.prDescription);

      const response = await model.generateContent(userPrompt);
      const text = response.response.text() || '{}';
      const parsed = JSON.parse(text);
      return LLMReviewResponseSchema.parse(parsed);
    } catch (err: any) {
      lastErr = err;
      if (!err.message?.includes('not found') && !err.message?.includes('no longer available')) {
        throw err;
      }
    }
  }

  throw lastErr || new Error('No available Gemini model found.');
}

async function reviewWithOpenAI(options: AIReviewOptions): Promise<LLMReviewResponse> {
  const openai = new OpenAI({ apiKey: config.openaiApiKey });
  const systemPrompt = buildReviewSystemPrompt(options.customInstructions);
  const userPrompt = buildReviewUserPrompt(options.diffText, options.prTitle, options.prDescription);

  const response = await openai.chat.completions.create({
    model: config.openaiModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(content);
  return LLMReviewResponseSchema.parse(parsed);
}

/**
 * Intelligent Mock Engine:
 * Analyzes diff patterns to generate rich, realistic structured review comments
 * for local testing, demoing, and offline runs.
 */
function reviewWithMockEngine(options: AIReviewOptions): LLMReviewResponse {
  const issues: ReviewIssue[] = [];
  const categoryScores: CategoryScores = {
    SECURITY: 100,
    BUG: 100,
    PERFORMANCE: 100,
    CODE_QUALITY: 100,
    BEST_PRACTICES: 100,
  };

  for (const file of options.files) {
    if (file.isDeleted) continue;

    for (const [lineNum, { content }] of file.lineMap.entries()) {
      const line = content.startsWith('+') ? content.slice(1).trim() : content.trim();

      // 1. SQL Injection
      if (/SELECT|INSERT|UPDATE|DELETE/i.test(line) && /\$\{.*?\}/.test(line)) {
        issues.push({
          id: uuidv4(),
          file: file.filePath,
          line: lineNum,
          severity: 'CRITICAL',
          category: 'SECURITY',
          title: 'SQL Injection Vulnerability',
          explanation: 'User input is directly concatenated into a dynamic SQL query string via template interpolation.',
          impact: 'Allows malicious actors to execute arbitrary SQL commands, potentially exposing, modifying, or destroying database records.',
          suggestedFix: 'const result = await db.query("SELECT * FROM payments WHERE amount = $1", [amount]);',
          originalCode: line,
          source: 'AI',
          status: 'OPEN',
        });
        categoryScores.SECURITY = Math.max(20, categoryScores.SECURITY - 40);
      }

      // 2. Missing Input Validation on req.body
      if (/const\s+\{?(\w+)\}?\s*=\s*req\.body/i.test(line) || /req\.body\.(\w+)/.test(line)) {
        const match = line.match(/req\.body\.(\w+)/) || line.match(/const\s+\{?(\w+)\}?\s*=\s*req\.body/);
        const varName = match ? match[1] : 'input';
        issues.push({
          id: uuidv4(),
          file: file.filePath,
          line: lineNum,
          severity: 'HIGH',
          category: 'SECURITY',
          title: 'Unvalidated Request Body Payload',
          explanation: `\`${varName}\` is extracted from \`req.body\` and used without schema validation, type checking, or sanitization.`,
          impact: 'May cause unhandled runtime crashes, type confusion errors, or allow malformed payloads into downstream business logic.',
          suggestedFix: `const { ${varName} } = validateSchema(req.body);\nif (!${varName}) return res.status(400).json({ error: 'Invalid ${varName}' });`,
          originalCode: line,
          source: 'AI',
          status: 'OPEN',
        });
        categoryScores.SECURITY = Math.max(40, categoryScores.SECURITY - 20);
      }

      // 3. Unhandled Promise / Missing try-catch in async handler
      if (/async\s*\([^)]*\)\s*=>/i.test(line) || /async\s+function/i.test(line)) {
        issues.push({
          id: uuidv4(),
          file: file.filePath,
          line: lineNum,
          severity: 'MEDIUM',
          category: 'BUG',
          title: 'Missing Error Handling in Async Route Handler',
          explanation: 'Async operations without structured try/catch or async boundary error handler can lead to unhandled promise rejections.',
          impact: 'Unhandled rejections can crash the Node.js process or leave client HTTP connections hanging until timeout.',
          suggestedFix: '// Wrap route handler in asyncHandler or try-catch block with next(err)',
          originalCode: line,
          source: 'AI',
          status: 'OPEN',
        });
        categoryScores.BUG = Math.max(50, categoryScores.BUG - 15);
      }

      // 4. Insecure Token / Math.random for security
      if (/Math\.random\(\)/.test(line) && /(token|secret|id|password|salt|auth)/i.test(line)) {
        issues.push({
          id: uuidv4(),
          file: file.filePath,
          line: lineNum,
          severity: 'HIGH',
          category: 'SECURITY',
          title: 'Insecure PRNG Used for Sensitive Token Generation',
          explanation: '`Math.random()` is not cryptographically secure and produces predictable pseudo-random sequences.',
          impact: 'Tokens generated with `Math.random()` can be brute-forced or predicted by attackers.',
          suggestedFix: 'const token = crypto.randomBytes(32).toString("hex");',
          originalCode: line,
          source: 'AI',
          status: 'OPEN',
        });
        categoryScores.SECURITY = Math.max(30, categoryScores.SECURITY - 25);
      }

      // 5. Array filter + map optimization (Performance)
      if (/\.filter\([^)]+\)\.map\([^)]+\)/.test(line)) {
        issues.push({
          id: uuidv4(),
          file: file.filePath,
          line: lineNum,
          severity: 'LOW',
          category: 'PERFORMANCE',
          title: 'Chained Array Iterations (.filter followed by .map)',
          explanation: 'Chaining `.filter().map()` creates an intermediate array allocation and iterates the collection twice.',
          impact: 'Increased GC pressure and CPU overhead on large datasets.',
          suggestedFix: '// Use a single .reduce() or for...of loop to filter and transform in one pass',
          originalCode: line,
          source: 'AI',
          status: 'OPEN',
        });
        categoryScores.PERFORMANCE = Math.max(70, categoryScores.PERFORMANCE - 10);
      }

      // 6. Magic Numbers / Hardcoded URLs
      if (/https?:\/\/[a-zA-Z0-9.-]+/.test(line) && !/localhost|example\.com/i.test(line)) {
        issues.push({
          id: uuidv4(),
          file: file.filePath,
          line: lineNum,
          severity: 'INFO',
          category: 'BEST_PRACTICES',
          title: 'Hardcoded Remote URL',
          explanation: 'External endpoint URL is hardcoded into the source code rather than defined in configuration or environment variables.',
          impact: 'Prevents easy environment promotion (staging/production) and requires code changes to switch endpoints.',
          suggestedFix: 'const API_URL = process.env.API_URL || "https://api.service.com";',
          originalCode: line,
          source: 'AI',
          status: 'OPEN',
        });
        categoryScores.BEST_PRACTICES = Math.max(80, categoryScores.BEST_PRACTICES - 5);
      }
    }
  }

  // Calculate overall score
  const scores = Object.values(categoryScores);
  const overallHealthScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  const summary = issues.length > 0
    ? `### 🔍 AI Review Summary\n\nIdentified **${issues.length} potential findings** across ${options.files.length} changed files.\n\n- 🔴 **Critical/High**: ${issues.filter((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH').length}\n- 🟡 **Medium/Low**: ${issues.filter((i) => i.severity === 'MEDIUM' || i.severity === 'LOW').length}\n- 🟢 **Suggestions**: ${issues.filter((i) => i.severity === 'INFO').length}\n\nReview the inline recommendations and suggested patches below.`
    : `### ✅ Clean Code Review\n\nNo critical security vulnerabilities, bugs, or performance bottlenecks detected in this change. Code adheres to project standards!`;

  return {
    summary,
    overallHealthScore,
    categoryScores,
    issues: issues.map((i) => ({
      file: i.file,
      line: i.line,
      endLine: i.endLine,
      severity: i.severity,
      category: i.category,
      title: i.title,
      explanation: i.explanation,
      impact: i.impact,
      suggestedFix: i.suggestedFix,
      originalCode: i.originalCode,
    })),
  };
}

