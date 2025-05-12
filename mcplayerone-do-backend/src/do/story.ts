// @ts-ignore: Cloudflare Workers environment provides WebSocketPair
export class StoryDO {
  state: any;
  env: any;
  rooms: Map<string, any>; // roomId -> room state (unused for now)
  users: Map<string, any>; // userId -> user state (in-memory, minimal)
  messageQueues: Map<string, Array<{ userId: string; message: string; timestamp: number }>>;
  websockets: Set<WebSocket>;

  constructor(state: any, env: any) {
    this.state = state;
    this.env = env;
    this.rooms = new Map();
    this.users = new Map();
    this.messageQueues = new Map();
    this.websockets = new Set();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.headers.get('Upgrade') === 'websocket') {
      console.log('[StoryDO] WebSocket upgrade attempted:', request.url);
      // WebSocket support (optional, for live features)
      // @ts-ignore
      const pair = typeof WebSocketPair !== 'undefined' ? new WebSocketPair() : { 0: null, 1: null };
      const client = pair[0];
      const server = pair[1];
      if (server) this.websocketSession(server);
      // @ts-ignore
      return new Response(null, { status: 101, webSocket: client });
    }
    if (request.method === 'POST') {
      const isPoll = url.pathname.endsWith('/poll');
      const isPeek = url.pathname.endsWith('/peek');
      try {
        const body = await request.json() as Record<string, unknown>;
        const userId = typeof body.userId === 'string' ? body.userId : '';
        if (!userId) {
          return new Response(JSON.stringify({ success: false, error: 'Missing userId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        // Register user if not present
        if (!this.users.has(userId)) {
          this.users.set(userId, { userId });
        }
        if (isPeek) {
          const messages = this.messageQueues.get(userId) || [];
          return new Response(JSON.stringify({ success: true, messages }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (isPoll) {
          const messages = this.messageQueues.get(userId) || [];
          this.messageQueues.set(userId, []); // Clear after delivery
          return new Response(JSON.stringify({ success: true, messages }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        // Handle message send
        const message = typeof body.message === 'string' ? body.message : '';
        if (!message) {
          return new Response(JSON.stringify({ success: false, error: 'Missing message' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        const payloadObj = { userId, message, timestamp: Date.now() };
        for (const uid of this.users.keys()) {
          if (uid !== userId) {
            const queue = this.messageQueues.get(uid) || [];
            queue.push(payloadObj);
            this.messageQueues.set(uid, queue);
          }
        }
        // Broadcast to all connected WebSocket clients
        for (const ws of this.websockets) {
          try {
            ws.send(JSON.stringify(payloadObj));
          } catch (e) {
            // Remove closed sockets
            this.websockets.delete(ws);
          }
        }
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid request' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
    }
    return new Response('Not found', { status: 404 });
  }

  websocketSession(ws: WebSocket) {
    // Optional: Support for live features
    let userId: string | null = null;
    this.websockets.add(ws);
    ws.addEventListener('message', (event) => {
      if (typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          if (!userId && typeof data.userId === 'string') {
            userId = data.userId;
            // Optionally, mark user as present/active
            return;
          }
        } catch {}
        // Optionally, broadcast to all clients
      }
    });
    ws.addEventListener('error', (event) => {
      // Handle error
      this.websockets.delete(ws);
    });
    ws.addEventListener('close', (event) => {
      // Optionally, mark user as inactive
      this.websockets.delete(ws);
    });
    ws.accept();
  }

  // Placeholder: Load users/rooms from DB
  async loadStoryStateFromDB(storyId: string) {
    // TODO: Implement DB fetch for users and rooms
  }
} 