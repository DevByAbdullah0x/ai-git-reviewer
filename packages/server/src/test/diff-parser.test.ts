import { parseUnifiedDiff } from '../analyzer/diff-parser';

export function testDiffParser() {
  console.log('🧪 Running Diff Parser Tests...');

  const sampleDiff = `diff --git a/src/auth/login.ts b/src/auth/login.ts
index 1234567..89abcdef 100644
--- a/src/auth/login.ts
+++ b/src/auth/login.ts
@@ -10,4 +10,6 @@ export async function handleLogin(req: Request, res: Response) {
   const { email, password } = req.body;
+  const user = await db.query(\`SELECT * FROM users WHERE email = '\${email}'\`);
+  return user;
 }`;

  const files = parseUnifiedDiff(sampleDiff);
  if (files.length !== 1) {
    throw new Error(`Expected 1 file, got ${files.length}`);
  }

  const file = files[0];
  if (file.filePath !== 'src/auth/login.ts') {
    throw new Error(`Expected filePath 'src/auth/login.ts', got '${file.filePath}'`);
  }

  if (!file.changedLines.includes(12)) {
    throw new Error(`Expected changedLines to contain line 12, got [${file.changedLines.join(', ')}]`);
  }

  console.log('  ✅ Diff parser accurately extracted file, hunks, and line numbers.');
}

