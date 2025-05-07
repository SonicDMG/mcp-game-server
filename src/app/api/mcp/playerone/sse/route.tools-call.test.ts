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

  it('proxies startGame tool call', async () => {
    const toolName = 'startGame';
    const toolArgs = { userId: 'user1', storyId: 'story1' };
    endpointMap[toolName] = { route: '/api/game/start', method: 'POST' };
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
      json: async () => ({ success: true, userId: 'user1', storyId: 'story1' })
    });
    const req = createMockRequest({ sessionId: 'test-session', method: 'tools/call', params: { name: toolName, arguments: toolArgs } });
    const res = await POST(req);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/game/start'), expect.anything());
    const decoded = new TextDecoder().decode(writer.write.mock.calls[0][0] as Uint8Array);
    expect(decoded).toContain('user1');
    expect(res.status).toBe(200);
  });

  it('proxies getGameState tool call', async () => {
    const toolName = 'getGameState';
    const toolArgs = { userId: 'user1', storyId: 'story1' };
    endpointMap[toolName] = { route: '/api/game/state', method: 'POST' };
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
      json: async () => ({ success: true, userId: 'user1', storyId: 'story1' })
    });
    const req = createMockRequest({ sessionId: 'test-session', method: 'tools/call', params: { name: toolName, arguments: toolArgs } });
    const res = await POST(req);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/game/state'), expect.anything());
    const decoded = new TextDecoder().decode(writer.write.mock.calls[0][0] as Uint8Array);
    expect(decoded).toContain('user1');
    expect(res.status).toBe(200);
  });

  it('proxies lookAround tool call', async () => {
    const toolName = 'lookAround';
    const toolArgs = { userId: 'user1', storyId: 'story1' };
    endpointMap[toolName] = { route: '/api/game/look', method: 'POST' };
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
      json: async () => ({ success: true, location: { id: 'loc1' } })
    });
    const req = createMockRequest({ sessionId: 'test-session', method: 'tools/call', params: { name: toolName, arguments: toolArgs } });
    const res = await POST(req);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/game/look'), expect.anything());
    const decoded = new TextDecoder().decode(writer.write.mock.calls[0][0] as Uint8Array);
    expect(decoded).toContain('loc1');
    expect(res.status).toBe(200);
  });

  it('proxies movePlayer tool call', async () => {
    const toolName = 'movePlayer';
    const toolArgs = { userId: 'user1', storyId: 'story1', target: 'loc2' };
    endpointMap[toolName] = { route: '/api/game/move', method: 'POST' };
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
      json: async () => ({ success: true, location: { id: 'loc2' } })
    });
    const req = createMockRequest({ sessionId: 'test-session', method: 'tools/call', params: { name: toolName, arguments: toolArgs } });
    const res = await POST(req);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/game/move'), expect.anything());
    const decoded = new TextDecoder().decode(writer.write.mock.calls[0][0] as Uint8Array);
    expect(decoded).toContain('loc2');
    expect(res.status).toBe(200);
  });

  it('proxies takeItem tool call', async () => {
    const toolName = 'takeItem';
    const toolArgs = { userId: 'user1', storyId: 'story1', target: 'item1' };
    endpointMap[toolName] = { route: '/api/game/take', method: 'POST' };
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
      json: async () => ({ success: true, item: 'item1', inventory: ['item1'] })
    });
    const req = createMockRequest({ sessionId: 'test-session', method: 'tools/call', params: { name: toolName, arguments: toolArgs } });
    const res = await POST(req);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/game/take'), expect.anything());
    const decoded = new TextDecoder().decode(writer.write.mock.calls[0][0] as Uint8Array);
    expect(decoded).toContain('item1');
    expect(res.status).toBe(200);
  });

  it('proxies examineTarget tool call', async () => {
    const toolName = 'examineTarget';
    const toolArgs = { userId: 'user1', storyId: 'story1', target: 'item1' };
    endpointMap[toolName] = { route: '/api/game/examine', method: 'POST' };
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
      json: async () => ({ success: true, name: 'item1', description: 'desc', type: 'item' })
    });
    const req = createMockRequest({ sessionId: 'test-session', method: 'tools/call', params: { name: toolName, arguments: toolArgs } });
    const res = await POST(req);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/game/examine'), expect.anything());
    const decoded = new TextDecoder().decode(writer.write.mock.calls[0][0] as Uint8Array);
    expect(decoded).toContain('item1');
    expect(res.status).toBe(200);
  });

  it('proxies solveChallenge tool call', async () => {
    const toolName = 'solveChallenge';
    const toolArgs = { userId: 'user1', storyId: 'story1', challengeId: 'c1', solution: '42' };
    endpointMap[toolName] = { route: '/api/game/challenge/solve', method: 'POST' };
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
      json: async () => ({ success: true, challengeId: 'c1', solved: true })
    });
    const req = createMockRequest({ sessionId: 'test-session', method: 'tools/call', params: { name: toolName, arguments: toolArgs } });
    const res = await POST(req);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/game/challenge/solve'), expect.anything());
    const decoded = new TextDecoder().decode(writer.write.mock.calls[0][0] as Uint8Array);
    expect(decoded).toContain('c1');
    expect(res.status).toBe(200);
  });

  it('proxies getStoryById tool call', async () => {
    const toolName = 'getStoryById';
    const toolArgs = { storyId: 'story1' };
    endpointMap[toolName] = { route: '/api/game/stories/story1', method: 'GET' };
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
      json: async () => ({ storyId: 'story1', title: 'Test Story' })
    });
    const req = createMockRequest({ sessionId: 'test-session', method: 'tools/call', params: { name: toolName, arguments: toolArgs } });
    const res = await POST(req);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/game/stories/story1'), expect.anything());
    const decoded = new TextDecoder().decode(writer.write.mock.calls[0][0] as Uint8Array);
    expect(decoded).toContain('Test Story');
    expect(res.status).toBe(200);
  });

  it('proxies deleteStory tool call', async () => {
    const toolName = 'deleteStory';
    const toolArgs = { storyId: 'story1' };
    endpointMap[toolName] = { route: '/api/game/stories/story1', method: 'DELETE' };
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
      json: async () => ({ success: true, message: 'Deleted' })
    });
    const req = createMockRequest({ sessionId: 'test-session', method: 'tools/call', params: { name: toolName, arguments: toolArgs } });
    const res = await POST(req);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/game/stories/story1'), expect.anything());
    const decoded = new TextDecoder().decode(writer.write.mock.calls[0][0] as Uint8Array);
    expect(decoded).toContain('Deleted');
    expect(res.status).toBe(200);
  });

  it('proxies getStoryCreationStatus tool call', async () => {
    const toolName = 'getStoryCreationStatus';
    const toolArgs = { id: 'story1' };
    endpointMap[toolName] = { route: '/api/game/stories/status', method: 'GET' };
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
      json: async () => ({ status: 'done', storyId: 'story1' })
    });
    const req = createMockRequest({ sessionId: 'test-session', method: 'tools/call', params: { name: toolName, arguments: toolArgs } });
    const res = await POST(req);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/game/stories/status'), expect.anything());
    const decoded = new TextDecoder().decode(writer.write.mock.calls[0][0] as Uint8Array);
    expect(decoded).toContain('done');
    expect(res.status).toBe(200);
  });

  it('proxies killPlayer tool call', async () => {
    const toolName = 'killPlayer';
    const toolArgs = { playerId: 'user1', targetId: 'user2', storyId: 'story1' };
    endpointMap[toolName] = { route: '/api/game/kill', method: 'POST' };
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
      json: async () => ({ success: true, outcome: 'success', lootableItems: ['item1'] })
    });
    const req = createMockRequest({ sessionId: 'test-session', method: 'tools/call', params: { name: toolName, arguments: toolArgs } });
    const res = await POST(req);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/game/kill'), expect.anything());
    const decoded = new TextDecoder().decode(writer.write.mock.calls[0][0] as Uint8Array);
    expect(decoded).toContain('lootableItems');
    expect(res.status).toBe(200);
  });

  it('proxies lootPlayer tool call', async () => {
    const toolName = 'lootPlayer';
    const toolArgs = { playerId: 'user1', targetId: 'user2', storyId: 'story1', items: ['item1'] };
    endpointMap[toolName] = { route: '/api/game/loot', method: 'POST' };
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
      json: async () => ({ success: true, items: ['item1'] })
    });
    const req = createMockRequest({ sessionId: 'test-session', method: 'tools/call', params: { name: toolName, arguments: toolArgs } });
    const res = await POST(req);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/game/loot'), expect.anything());
    const decoded = new TextDecoder().decode(writer.write.mock.calls[0][0] as Uint8Array);
    expect(decoded).toContain('item1');
    expect(res.status).toBe(200);
  });

  it('proxies helpPlayer tool call', async () => {
    const toolName = 'helpPlayer';
    const toolArgs = { playerId: 'user1', targetId: 'user2', storyId: 'story1' };
    endpointMap[toolName] = { route: '/api/game/help', method: 'POST' };
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: (h: string) => h === 'content-type' ? 'application/json' : null },
      json: async () => ({ success: true, message: 'Helped' })
    });
    const req = createMockRequest({ sessionId: 'test-session', method: 'tools/call', params: { name: toolName, arguments: toolArgs } });
    const res = await POST(req);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/game/help'), expect.anything());
    const decoded = new TextDecoder().decode(writer.write.mock.calls[0][0] as Uint8Array);
    expect(decoded).toContain('Helped');
    expect(res.status).toBe(200);
  });
}); 