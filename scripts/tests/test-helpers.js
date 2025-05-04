// test-helpers.js: Shared utility functions for all game scenario tests
// Import this file in your test scripts to avoid code duplication.

const fetch = require('node-fetch');
const delay = ms => new Promise(res => setTimeout(res, ms));
const GAME_API = 'http://localhost:3000/api/game';
const BASE_API = 'http://localhost:3000/api';

async function post(endpoint, body, apiBase = GAME_API) {
  const fullUrl = `${apiBase}${endpoint}`;
  const res = await fetch(fullUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`HTTP error! status: ${res.status}, message: ${errorBody}`);
  }
  try {
    return await res.json();
  } catch (e) {
    throw new Error(`Failed to parse JSON response from ${fullUrl}`);
  }
}

async function get(endpoint, apiBase = GAME_API) {
  const fullUrl = `${apiBase}${endpoint}`;
  const res = await fetch(fullUrl);
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`HTTP error! status: ${res.status}, message: ${errorBody}`);
  }
  try {
    return await res.json();
  } catch (e) {
    throw new Error(`Failed to parse JSON response from ${fullUrl}`);
  }
}

async function resetGame(userIdToReset, storyIdToReset) {
  const resetEndpoint = '/reset';
  const fullUrl = `${BASE_API}${resetEndpoint}`;
  const res = await fetch(fullUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: userIdToReset, storyId: storyIdToReset }),
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to reset game state: ${errorBody}`);
  }
}

async function getPlayerState(userId, storyId) {
  return await post('/state', { userId, storyId }, GAME_API);
}

async function retry(fn, retries = 3, delayMs = 500) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < retries - 1) await delay(delayMs);
    }
  }
  throw lastErr;
}

let _testStoryLogicalId = null;
function setTestStoryLogicalId(id) { _testStoryLogicalId = id; }
function getTestStoryLogicalId() { return _testStoryLogicalId; }

async function getLocations() {
  const storyId = getTestStoryLogicalId();
  if (!storyId) throw new Error('testStoryLogicalId not set');
  return await retry(async () => {
    const res = await get(`/story-metadata?id=${storyId}`, BASE_API);
    return res.rooms || [];
  });
}

async function debugStoriesAndMetadata(storyId) {
  try {
    await get('/stories', BASE_API);
    await get(`/story-metadata?id=${storyId}`, BASE_API);
  } catch (err) {}
}

async function safeApiCall(fn, label) {
  try {
    return await fn();
  } catch (err) {
    console.error(`ERROR in ${label}:`, err.message || err);
    return null;
  }
}

function findPath(locations, startId, goalId) {
  const queue = [[startId]];
  const visited = new Set();
  while (queue.length) {
    const path = queue.shift();
    const current = path[path.length - 1];
    if (current === goalId) return path;
    if (visited.has(current)) continue;
    visited.add(current);
    const loc = locations.find(l => l.id === current);
    if (loc && loc.exits) {
      for (const exit of loc.exits) {
        const targetId = exit.targetLocationId || exit.target;
        if (targetId && !visited.has(targetId)) {
          queue.push([...path, targetId]);
        }
      }
    }
  }
  return null;
}

async function moveUserToGoal(userId, storyId, goalRoomId) {
  const locations = await getLocations();
  const state = await getPlayerState(userId, storyId);
  const startId = state.location.id;
  const path = findPath(locations, startId, goalRoomId);
  if (!path) throw new Error(`No path from ${startId} to ${goalRoomId}`);
  for (let i = 1; i < path.length; i++) {
    const target = path[i];
    await post('/move', { userId, target, storyId }, GAME_API);
    await delay(100);
  }
}

async function pickupArtifacts(userId, storyId, requiredArtifacts) {
  const state = await getPlayerState(userId, storyId);
  const itemsHere = state.location.items || [];
  const inventory = state.player.inventory || [];
  for (const artifact of requiredArtifacts) {
    if (itemsHere.includes(artifact) && !inventory.includes(artifact)) {
      try {
        const response = await post('/take', { userId, target: artifact, storyId }, GAME_API);
        if (!response.success) {
          console.error(`ERROR picking up ${artifact} for ${userId}:`, response);
        }
      } catch (err) {
        console.error(`EXCEPTION picking up ${artifact} for ${userId}:`, err.message || err);
      }
      await delay(100);
    }
  }
}

module.exports = {
  post,
  get,
  resetGame,
  getPlayerState,
  retry,
  getLocations,
  debugStoriesAndMetadata,
  safeApiCall,
  findPath,
  moveUserToGoal,
  pickupArtifacts,
  delay,
  GAME_API,
  BASE_API,
  setTestStoryLogicalId,
  getTestStoryLogicalId,
}; 