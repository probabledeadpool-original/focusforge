import { runMcpTests } from '../lib/__tests__/mcpServer.test';

async function main() {
  try {
    await runMcpTests();
    console.log('🎉 All Remote MCP validations executed with 100% success!');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
}

main();
