#!/usr/bin/env node

const delay = ms => new Promise(res => setTimeout(res, ms));
const API = 'http://localhost:3000/api';

async function post(endpoint, body) {
  const res = await fetch(`${API}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function get(endpoint) {
  const res = await fetch(`${API}${endpoint}`);
  return res.json();
}

async function resetGame() {
  // Call the new /api/reset endpoint to reseed users
  const res = await fetch(`${API}/reset`, { method: 'POST' });
  if (res.ok) {
    console.log('Game state reset via /api/reset.');
  } else {
    console.error('Failed to reset game state!');
  }
}

async function run() {
  await resetGame();
  // Simulate users
  // neo: will win
  // trinity: collects some artifacts
  // case: collects one artifact
  // molly: just moves

  // neo's path to win
  await post('/move', { userId: 'neo', direction: 'west' }); // vault -> lobby
  await post('/move', { userId: 'neo', direction: 'west' }); // lobby -> market
  await post('/take', { userId: 'neo' }); // take Holo Badge
  await post('/move', { userId: 'neo', direction: 'north' }); // market -> alley
  await post('/take', { userId: 'neo' }); // take Neon Katana
  await post('/move', { userId: 'neo', direction: 'east' }); // alley -> arcade
  await post('/take', { userId: 'neo' }); // take Quantum Key
  await post('/move', { userId: 'neo', direction: 'south' }); // arcade -> lobby
  await post('/take', { userId: 'neo' }); // take Data Shard
  await post('/move', { userId: 'neo', direction: 'east' }); // lobby -> vault
  // Now neo should have all artifacts and reach the goal

  // trinity: collects some artifacts
  await post('/move', { userId: 'trinity', direction: 'west' }); // lobby -> market
  await post('/take', { userId: 'trinity' }); // take Holo Badge
  await post('/move', { userId: 'trinity', direction: 'north' }); // market -> alley
  await post('/take', { userId: 'trinity' }); // take Neon Katana

  // case: collects one artifact
  await post('/take', { userId: 'case' }); // take Quantum Key

  // molly: just moves
  await post('/move', { userId: 'molly', direction: 'north' }); // market -> alley

  // Wait for all actions to process
  await delay(500);

  // Print leaderboard
  const leaderboard = await get('/leaderboard');
  console.log('\nFinal Leaderboard:');
  leaderboard.forEach(u => {
    console.log(`- ${u.id}: ${u.inventory.join(', ') || 'No artifacts'} | Room: ${u.room} | ${u.reachedGoal ? '🏁 Vault!' : ''}`);
  });
}

run(); 