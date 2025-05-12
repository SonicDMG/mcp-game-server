// @ts-ignore: Cloudflare Workers environment provides WebSocketPair
export class RoomDO {
  state: any;
  env: any;
  clients: Set<WebSocket>;

  constructor(state: any, env: any) {
    this.state = state;
    this.env = env;
    this.clients = new Set();
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') === 'websocket') {
      // Cloudflare Workers: WebSocketPair is available globally
      // @ts-ignore
      const pair = typeof WebSocketPair !== 'undefined' ? new WebSocketPair() : { 0: null, 1: null };
      const client = pair[0];
      const server = pair[1];
      if (server) this.websocketSession(server);
      // 'webSocket' is a Cloudflare-specific property
      // @ts-ignore
      return new Response(null, { status: 101, webSocket: client });
    }
    if (request.method === 'POST') {
      try {
        const body = await request.json() as Record<string, unknown>;
        const userId = typeof body.userId === 'string' ? body.userId : '';
        const message = typeof body.message === 'string' ? body.message : '';
        if (!userId || !message) {
          return new Response(JSON.stringify({ success: false, error: 'Missing userId or message' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        const payload = JSON.stringify({ userId, message, timestamp: Date.now() });
        for (const client of this.clients) {
          if (client.readyState === 1) {
            client.send(payload);
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
    this.clients.add(ws);
    console.log('Client connected. Total clients:', this.clients.size);
    ws.addEventListener('open', () => {
      console.log('WebSocket open event');
    });
    ws.addEventListener('message', (event) => {
      console.log('Received message event:', event);
      console.log('Received message data:', event.data);
      for (const client of this.clients) {
        if (client.readyState === 1) {
          console.log('Broadcasting to client');
          client.send(event.data);
        }
      }
    });
    ws.addEventListener('error', (event) => {
      console.log('WebSocket error event:', event);
    });
    ws.addEventListener('close', (event) => {
      this.clients.delete(ws);
      console.log('Client disconnected. Total clients:', this.clients.size);
      console.log('WebSocket close event:', event);
    });
    ws.accept(); // Required for Cloudflare Workers to receive events
  }
} 