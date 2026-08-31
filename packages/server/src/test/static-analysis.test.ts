import { parseUnifiedDiff } from '../analyzer/diff-parser';
import { runStaticAnalysis } from '../analyzer/static/scanner';

export function testStaticAnalysis() {
  console.log('🧪 Running Static Analysis & Secret Detection Tests...');

  const mockAws = 'AKIA' + 'IOSFODNN7EXAMPLE';
  const mockStripe = 'sk_' + 'test_' + '51Abcd1234567890abcdef12345';
  const vulnerableDiff = `diff --git a/src/config.ts b/src/config.ts
index 0000000..1111111 100644
--- a/src/config.ts
+++ b/src/config.ts
@@ -1,3 +1,5 @@
+const awsKey = "${mockAws}";
+const stripeKey = "${mockStripe}";
+const evalResult = eval(userInput);
`;

  const files = parseUnifiedDiff(vulnerableDiff);
  const issues = runStaticAnalysis(files);

  const hasAwsKey = issues.some((i) => i.title.includes('AWS Access Key'));
  const hasStripeKey = issues.some((i) => i.title.includes('Stripe'));
  const hasEval = issues.some((i) => i.title.includes('eval'));

  if (!hasAwsKey || !hasStripeKey || !hasEval) {
    throw new Error(`Static analysis failed to detect vulnerabilities. Found: ${issues.map((i) => i.title).join(', ')}`);
  }

  console.log(`  ✅ Static analysis successfully caught all 3 vulnerabilities (${issues.length} total findings).`);
}

