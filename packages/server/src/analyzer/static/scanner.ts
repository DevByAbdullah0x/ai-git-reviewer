import { v4 as uuidv4 } from 'uuid';
import { ReviewIssue } from '@ai-reviewer/shared';
import { FileChangeContext } from '../diff-parser';

interface StaticRule {
  id: string;
  name: string;
  category: ReviewIssue['category'];
  severity: ReviewIssue['severity'];
  pattern: RegExp;
  title: string;
  explanation: (match: RegExpExecArray, line: string) => string;
  impact: string;
  suggestFix: (line: string, match: RegExpExecArray) => string | undefined;
}

const STATIC_RULES: StaticRule[] = [
  {
    id: 'SEC-001-AWS-SECRET',
    name: 'Hardcoded AWS Access Key',
    category: 'SECURITY',
    severity: 'CRITICAL',
    pattern: /(?:AKIA[0-9A-Z]{16})/g,
    title: 'Hardcoded AWS Access Key Detected',
    explanation: () =>
      'An AWS Access Key ID was detected directly in source code. Committing credentials to source control exposes cloud infrastructure to immediate compromise.',
    impact: 'Unauthorized access and potential takeover of AWS cloud resources.',
    suggestFix: (line) => line.replace(/AKIA[0-9A-Z]{16}/g, 'process.env.AWS_ACCESS_KEY_ID'),
  },
  {
    id: 'SEC-002-GITHUB-TOKEN',
    name: 'Exposed GitHub Personal Access Token',
    category: 'SECURITY',
    severity: 'CRITICAL',
    pattern: /ghp_[a-zA-Z0-9]{36}/g,
    title: 'Hardcoded GitHub Personal Access Token',
    explanation: () =>
      'A personal GitHub access token is hardcoded in the diff. Automated token scrapers can harvest this to compromise repositories and organizations.',
    impact: 'Repository data exfiltration or unauthorized code modification.',
    suggestFix: (line) => line.replace(/ghp_[a-zA-Z0-9]{36}/g, 'process.env.GITHUB_TOKEN'),
  },
  {
    id: 'SEC-003-STRIPE-KEY',
    name: 'Exposed Stripe API Key',
    category: 'SECURITY',
    severity: 'CRITICAL',
    pattern: /sk_(?:live|test)_[0-9a-zA-Z]{24,}/g,
    title: 'Hardcoded Stripe API Secret Key',
    explanation: () =>
      'A Stripe Secret API key is hardcoded. Exposing payment gateway secrets enables fraudulent transactions, refunds, and financial exposure.',
    impact: 'Financial loss and unauthorized access to customer billing information.',
    suggestFix: (line) => line.replace(/sk_(?:live|test)_[0-9a-zA-Z]{24,}/g, 'process.env.STRIPE_SECRET_KEY'),
  },
  {
    id: 'SEC-004-PRIVATE-KEY',
    name: 'Private Key Block in Source Code',
    category: 'SECURITY',
    severity: 'CRITICAL',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    title: 'Hardcoded Private Cryptographic Key',
    explanation: () =>
      'Cryptographic private keys must never be committed to source repositories. Load certificates and keys from secure vault storage or environment variables.',
    impact: 'Complete compromise of encrypted communication and digital signature authenticity.',
    suggestFix: () => 'process.env.PRIVATE_KEY',
  },
  {
    id: 'SEC-005-SQLI-INTERPOLATION',
    name: 'SQL Query Direct Interpolation',
    category: 'SECURITY',
    severity: 'CRITICAL',
    pattern: /(?:db|pool|client|connection)\.(?:query|execute|raw)\s*\(\s*`[^`]*\$\{[^}]+\}[^`]*`/g,
    title: 'Direct SQL String Interpolation (SQL Injection Risk)',
    explanation: () =>
      'SQL statement interpolates variables directly using template literals. Untrusted user inputs passed into unparameterized queries can execute arbitrary SQL commands.',
    impact: 'Full database compromise, unauthorized data extraction, or data destruction.',
    suggestFix: (line) => {
      return line
        .replace(/`([^`]*)SELECT (.*?) WHERE (.*?)\s*=\s*\$\{(.*?)\}([^`]*)`/gi, '"SELECT $2 WHERE $3 = $1", [$4]')
        .replace(/`([^`]*)SELECT (.*?) WHERE (.*?)\s*=\s*'(.*?)\$\{(.*?)\}'([^`]*)`/gi, '"SELECT $2 WHERE $3 = $1", [$5]');
    },
  },
  {
    id: 'SEC-006-DANGEROUS-EVAL',
    name: 'Dangerous eval() Invocation',
    category: 'SECURITY',
    severity: 'CRITICAL',
    pattern: /\beval\s*\([^)]+\)/g,
    title: 'Dangerous Use of eval()',
    explanation: () =>
      'Invoking `eval()` executes arbitrary JavaScript strings with caller privileges. It allows attackers to inject malicious payloads or break sandbox boundaries.',
    impact: 'Arbitrary code execution within the runtime context.',
    suggestFix: () => '// Refactor to avoid dynamic code evaluation (e.g. JSON.parse or explicit function mappings)',
  },
  {
    id: 'SEC-007-DANGEROUS-INNERHTML',
    name: 'Direct innerHTML Assignment (XSS)',
    category: 'SECURITY',
    severity: 'HIGH',
    pattern: /(?:\.innerHTML\s*=|\bdangerouslySetInnerHTML\s*=\s*\{\s*__html\s*:)/g,
    title: 'Unsanitized HTML Rendering (Cross-Site Scripting)',
    explanation: () =>
      'Assigning unescaped strings directly to innerHTML or dangerouslySetInnerHTML can trigger stored or reflected XSS if the content contains user data.',
    impact: 'Cross-Site Scripting (XSS), session hijacking, and DOM manipulation.',
    suggestFix: (line) => line.replace(/\.innerHTML\s*=\s*(.*?);?$/, '.textContent = $1;'),
  },
  {
    id: 'PERF-001-LOOP-ASYNC-QUERY',
    name: 'Database Query Inside Loop (N+1 Pattern)',
    category: 'PERFORMANCE',
    severity: 'HIGH',
    pattern: /(?:for\s*\([^)]+\)|for\s+await\s*\([^)]+\)|\.forEach\s*\()\s*\{?[^}]*(?:await\s+)?(?:db|repo|prisma|model)\./g,
    title: 'Potential N+1 Database Query in Loop',
    explanation: () =>
      'Executing individual database queries inside a loop results in N+1 network roundtrips. Batch fetch records using an IN clause or single join.',
    impact: 'Severe latency degradation and high database connection pool exhaustion under load.',
    suggestFix: () => '// Batch query using: const items = await db.find({ where: { id: { in: ids } } });',
  },
  {
    id: 'BUG-001-LOOSE-EQUALITY',
    name: 'Unsafe Loose Equality Comparison',
    category: 'BUG',
    severity: 'LOW',
    pattern: /[^!=]==[^=]/g,
    title: 'Loose Equality Operator (==) Used',
    explanation: () =>
      'Using `==` triggers implicit type coercion in JavaScript which can lead to subtle bugs (e.g., `0 == ""` is true). Prefer strict equality `===`.',
    impact: 'Unexpected truthy/falsy evaluation and runtime logic errors.',
    suggestFix: (line) => line.replace(/==/g, '==='),
  },
];

export function runStaticAnalysis(files: FileChangeContext[]): ReviewIssue[] {
  const issues: ReviewIssue[] = [];

  for (const file of files) {
    if (file.isDeleted) continue;

    for (const [lineNumber, { content }] of file.lineMap.entries()) {
      const cleanLine = content.startsWith('+') ? content.slice(1).trim() : content.trim();

      for (const rule of STATIC_RULES) {
        // Reset regex state
        rule.pattern.lastIndex = 0;
        const match = rule.pattern.exec(cleanLine);

        if (match) {
          const suggestedFix = rule.suggestFix(cleanLine, match);

          issues.push({
            id: uuidv4(),
            file: file.filePath,
            line: lineNumber,
            severity: rule.severity,
            category: rule.category,
            title: rule.title,
            explanation: rule.explanation(match, cleanLine),
            impact: rule.impact,
            suggestedFix,
            originalCode: cleanLine,
            source: 'STATIC',
            status: 'OPEN',
            ruleId: rule.id,
          });
        }
      }
    }
  }

  return issues;
}

