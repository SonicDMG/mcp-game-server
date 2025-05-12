const WebSocket = require('ws');
const ws = new WebSocket('wss://mcplayerone-do-backend.david-gilardi.workers.dev/story/testroom');

ws.on('open', () => {
  console.log('WebSocket connection opened');
  ws.send('Hello from Node!');
});

ws.on('message', (data) => {
  console.log('Received:', data.toString());
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err);
});

ws.on('close', () => {
  console.log('WebSocket connection closed');
});