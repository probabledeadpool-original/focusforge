import { cleanJarvisOutput, extractFinalResponse } from '../lib/jarvisOutputCleaner';

interface TestCase {
  name: string;
  input: any;
  expected: string;
}

const testCases: TestCase[] = [
  {
    name: "Transcript with role labels and asterisks",
    input: `user\nWhat is 2+2?\n***\nassistant\n4`,
    expected: "4"
  },
  {
    name: "Gemma start/end of turn tokens",
    input: `<start_of_turn>model\nThe meeting is at 4 PM.\n<end_of_turn>`,
    expected: "The meeting is at 4 PM."
  },
  {
    name: "Thought and final prefixes",
    input: `thought:\nI need to calculate the answer.\nfinal:\nThe answer is 42.`,
    expected: "The answer is 42."
  },
  {
    name: "Accidental markdown code fence wrapping",
    input: "```markdown\nThe answer is 42.\n```",
    expected: "The answer is 42."
  },
  {
    name: "Multi-line dialog with separator",
    input: `User: Search my files\nAssistant: I will search your files.\n***\nI found three matching files.`,
    expected: "I found three matching files."
  },
  {
    name: "Legitimate markdown bullet list preservation",
    input: `- First item\n- Second item`,
    expected: `- First item\n- Second item`
  },
  {
    name: "Preserve negative numbers and dashes",
    input: `The temperature in Antarctica is -20°C today.`,
    expected: `The temperature in Antarctica is -20°C today.`
  },
  {
    name: "Extract parts from Gemini API candidate response",
    input: {
      candidates: [
        {
          content: {
            parts: [
              { text: "Internal thinking...", thought: true },
              { text: "The capital of France is Paris.", thought: false }
            ]
          }
        }
      ]
    },
    expected: "The capital of France is Paris."
  }
];

let passed = 0;
let failed = 0;

console.log("=== RUNNING JARVIS OUTPUT CLEANER TEST SUITE ===\n");

for (const tc of testCases) {
  const rawExtracted = extractFinalResponse(tc.input);
  const actual = cleanJarvisOutput(rawExtracted);

  if (actual === tc.expected) {
    console.log(`[PASS] ${tc.name}`);
    passed++;
  } else {
    console.error(`[FAIL] ${tc.name}`);
    console.error(`  Expected: ${JSON.stringify(tc.expected)}`);
    console.error(`  Actual:   ${JSON.stringify(actual)}\n`);
    failed++;
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("All output formatting tests passed successfully!");
}
