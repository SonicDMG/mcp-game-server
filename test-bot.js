#!/usr/bin/env node

async function main() {
  const [,, userId, color, x, y] = process.argv;
  if (!userId || !color || x === undefined || y === undefined) {
    console.log('Usage: node test-bot.js <userId> <color> <x> <y>');
    process.exit(1);
  }

  // Move user
  const moveRes = await fetch('http://localhost:3000/api/move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, dx: x, dy: y }),
  });
  let moveData;
  try {
    moveData = await moveRes.json();
  } catch (e) {
    console.error('Move response not valid JSON:', e);
    moveData = null;
  }

  // Paint tile
  const res = await fetch('http://localhost:3000/api/paint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, color }),
  });
  let data;
  try {
    data = await res.json();
  } catch (e) {
    console.error('Paint response not valid JSON:', e);
    data = null;
  }
  console.log('Painted:', { userId, color, x, y });
  console.log('Move response:', moveData);
  console.log('Paint response:', data);
}

main(); 