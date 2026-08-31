import { testDiffParser } from './diff-parser.test';
import { testStaticAnalysis } from './static-analysis.test';
import { testScoring } from './score.test';

async function main() {
  console.log('====================================================');
  console.log('🚀 Starting AI Git Reviewer Test Suite');
  console.log('====================================================');

  try {
    testDiffParser();
    testStaticAnalysis();
    testScoring();

    console.log('====================================================');
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================');
  } catch (err: any) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
}

main();

