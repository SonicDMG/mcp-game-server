import { POST } from './route';
import { endpointMap, clients } from './sse-internals';
import { NextRequest } from 'next/server';

// Helper to create a mock NextRequest
function createMockRequest({ sessionId, method, params }: { sessionId: string, method: string, params: Record<string, unknown> }) {
  return {
    nextUrl: {
      pathname: '/api/mcp/playerone/sse',
      searchParams: new URLSearchParams({ session_id: sessionId })
    },
    json: async () => ({ id: 1, method, params })
  } as unknown as NextRequest;
}

// Minimal writer mock interface for test
interface WriterMock {
  write: jest.Mock<Promise<void> | void, [Uint8Array | string]>;
  close: jest.Mock<Promise<void> | void, []>;
}

describe('tools/call handler', () => {
  let writer: WriterMock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    // Set API_BASE_URL for dynamic base URL logic
    process.env.API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
    // Mock the clients map and writer
    writer = { write: jest.fn(), close: jest.fn() };
    clients.set('test-session', writer as unknown as WritableStreamDefaultWriter<Uint8Array>);
    // Mock fetch to return a Response-like object
    (global as unknown as { fetch: jest.Mock }).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: (header: string) => header === 'content-type' ? 'application/json' : null,
      },
      json: async () => ({ stories: [1, 2, 3] })
    });
  });

  afterEach(() => {
    clients.delete('test-session');
  });

  it('proxies tools/call to the correct endpoint and returns the result', async () => {
    // Arrange
    const toolName = 'listStories';
    const toolArgs = { foo: 'bar' };
    endpointMap[toolName] = { route: '/api/mcp/playerone/listStories', method: 'POST' };
    // Create request
    const req = createMockRequest({
      sessionId: 'test-session',
      method: 'tools/call',
      params: { name: toolName, arguments: toolArgs }
    });

    // Act
    const res = await POST(req);

    // Assert
    const baseUrl = process.env.API_BASE_URL;
    expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/mcp/playerone/listStories`, expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toolArgs)
    }));
    const lastWriteArg = writer.write.mock.calls[0][0];
    const decoded = new TextDecoder().decode(lastWriteArg as Uint8Array);
    expect(decoded).toEqual(expect.stringContaining('stories'));
    expect(res.status).toBe(200);
  });

  it('returns error if tool name is missing', async () => {
    const req = createMockRequest({
      sessionId: 'test-session',
      method: 'tools/call',
      params: { arguments: {} }
    });
    const res = await POST(req);
    const lastWriteArg = writer.write.mock.calls[0][0];
    const decoded = new TextDecoder().decode(lastWriteArg as Uint8Array);
    expect(decoded).toEqual(expect.stringContaining('Tool name missing'));
    expect(res.status).toBe(200);
  });

  it('returns error if endpoint not found', async () => {
    const req = createMockRequest({
      sessionId: 'test-session',
      method: 'tools/call',
      params: { name: 'notARealTool', arguments: {} }
    });
    const res = await POST(req);
    const lastWriteArg = writer.write.mock.calls[0][0];
    const decoded = new TextDecoder().decode(lastWriteArg as Uint8Array);
    expect(decoded).toEqual(expect.stringContaining('Tool not found'));
    expect(res.status).toBe(200);
  });

  it('proxies createGame tool call with required theme parameter', async () => {
    // Arrange
    const toolName = 'createGame';
    const toolArgs = { theme: 'haunted library' };
    endpointMap[toolName] = { route: '/api/game/stories', method: 'POST' };
    // Mock fetch to return a valid createGame response
    (global as unknown as { fetch: jest.Mock }).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: (header: string) => header === 'content-type' ? 'application/json' : null,
      },
      json: async () => ({ storyId: 'generated_story_id', status: 'done', message: 'Game created', title: 'Haunted Library', theme: 'haunted library' })
    });
    // Create request
    const req = createMockRequest({
      sessionId: 'test-session',
      method: 'tools/call',
      params: { name: toolName, arguments: toolArgs }
    });

    // Act
    const res = await POST(req);

    // Assert
    const baseUrl = process.env.API_BASE_URL;
    expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/game/stories`, expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toolArgs)
    }));
    const lastWriteArg = writer.write.mock.calls[0][0];
    const decoded = new TextDecoder().decode(lastWriteArg as Uint8Array);
    expect(decoded).toEqual(expect.stringContaining('Game created'));
    expect(res.status).toBe(200);
  });
}); 