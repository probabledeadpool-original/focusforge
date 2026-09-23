import { POST, GET } from '../../app/api/mcp/route';
import { GET as healthGET } from '../../app/api/health/route';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

export async function runMcpTests() {
  const validToken = 'test_secret_mcp_token_123';
  process.env.MCP_AUTH_TOKEN = validToken;

  console.log('[MCP Test] Starting validation suite...');

  // 1. Health endpoint test
  const healthReq = new Request('http://localhost:3000/api/health', { method: 'GET' });
  const healthRes = await healthGET(healthReq);
  assert(healthRes.status === 200, 'Health status should be 200');

  const healthJson = await healthRes.json();
  assert(healthJson.status === 'healthy', 'Health should be healthy');
  assert(healthJson.capabilities.tools.count === 12, 'Capabilities count should be 12');
  assert(healthJson.capabilities.tools.list.includes('get_current_user'), 'Tools should include get_current_user');
  assert(healthJson.capabilities.tools.list.includes('get_video_metadata'), 'Tools should include get_video_metadata');
  console.log('✓ Health & Capability discovery verified.');

  // 2. Unauthenticated rejection
  const unauthReq = new Request('http://localhost:3000/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    })
  });
  const unauthRes = await POST(unauthReq);
  assert(unauthRes.status === 401, 'Unauthenticated request should return 401');
  console.log('✓ Unauthenticated request rejection verified.');

  // 3. Invalid token rejection
  const invalidReq = new Request('http://localhost:3000/api/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer wrong_token'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    })
  });
  const invalidRes = await POST(invalidReq);
  assert(invalidRes.status === 401, 'Invalid token should return 401');
  console.log('✓ Invalid token rejection verified.');

  // 4. Authorized tools/list
  const listReq = new Request('http://localhost:3000/api/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${validToken}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/list',
      params: {}
    })
  });
  const listRes = await POST(listReq);
  assert(listRes.status === 200, 'Authorized tools/list should return 200');
  const listJson = await listRes.json();
  assert(listJson.result.tools.length === 12, 'Should list 12 tools');
  console.log('✓ Authorized tools/list verified.');

  // 5. Tool execution: get_current_user
  const userReq = new Request('http://localhost:3000/api/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${validToken}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'get_current_user',
        arguments: {}
      }
    })
  });
  const userRes = await POST(userReq);
  assert(userRes.status === 200, 'get_current_user should return 200');
  const userJson = await userRes.json();
  const userData = JSON.parse(userJson.result.content[0].text);
  assert(userData.name === 'Vatsal Sovereign', 'User data should match authenticated identity');
  console.log('✓ Tool execution & identity isolation verified.');

  // 6. Zod validation failure on missing required param
  const invalidToolReq = new Request('http://localhost:3000/api/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${validToken}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'get_project',
        arguments: {} // Missing required projectId
      }
    })
  });
  const invalidToolRes = await POST(invalidToolReq);
  assert(invalidToolRes.status === 400, 'Missing required argument should return 400');
  console.log('✓ Zod input validation verified.');

  console.log('All MCP test suites passed successfully!');
  return true;
}
