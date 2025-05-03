#!/usr/bin/env node

const fetch = require('node-fetch');
const delay = ms => new Promise(res => setTimeout(res, ms));
// Keep game API for game actions
const GAME_API = 'http://localhost:3000/api/game';
// Define base API for non-game endpoints like reset
const BASE_API = 'http://localhost:3000/api';

async function post(endpoint, body, apiBase = GAME_API) {
  const fullUrl = `${apiBase}${endpoint}`;
  console.log(`POST ${fullUrl} with body:`, JSON.stringify(body, null, 2));
  const res = await fetch(fullUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  // Check status before trying to parse JSON
  if (!res.ok) {
      const errorBody = await res.text(); // Read error as text
      console.error(`Error ${res.status} from ${fullUrl}:`, errorBody);
      throw new Error(`HTTP error! status: ${res.status}, message: ${errorBody}`);
  }

  // Try parsing JSON only if response is OK
  try {
      const responseBody = await res.json();
      console.log(`Response ${res.status} from ${fullUrl}:`, responseBody);
      return responseBody;
  } catch (e) {
      console.error(`Failed to parse JSON response from ${fullUrl}:`, e);
      // Handle cases where server returns OK status but invalid JSON
      throw new Error(`Failed to parse JSON response from ${fullUrl}`); 
  }
}

async function get(endpoint, apiBase = GAME_API) {
  const fullUrl = `${apiBase}${endpoint}`;
  console.log(`GET ${fullUrl}`);
  const res = await fetch(fullUrl);

  // Check status before trying to parse JSON
  if (!res.ok) {
      const errorBody = await res.text(); // Read error as text
      console.error(`Error ${res.status} from ${fullUrl}:`, errorBody);
      throw new Error(`HTTP error! status: ${res.status}, message: ${errorBody}`);
  }

  // Try parsing JSON only if response is OK
  try {
      const responseBody = await res.json();
      console.log(`Response ${res.status} from ${fullUrl}:`, responseBody);
      return responseBody;
  } catch (e) {
      console.error(`Failed to parse JSON response from ${fullUrl}:`, e);
      throw new Error(`Failed to parse JSON response from ${fullUrl}`);
  }
}

// Modify resetGame to accept parameters (removed TS types)
async function resetGame(userIdToReset, storyIdToReset) {
  // Use BASE_API and correct endpoint /reset
  const resetEndpoint = '/reset';
  const fullUrl = `${BASE_API}${resetEndpoint}`;
  console.log(`POST ${fullUrl} to reset game state for user: ${userIdToReset}, story: ${storyIdToReset}...`);
  const res = await fetch(fullUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Use the passed parameters in the body
    body: JSON.stringify({
      userId: userIdToReset,
      storyId: storyIdToReset
    }),
  });
  if (res.ok) {
    console.log(`Game state reset via ${fullUrl}.`);
  } else {
    const errorBody = await res.text();
    console.error(`Failed to reset game state via ${fullUrl}! Status: ${res.status}, Body: ${errorBody}`);
    // Optionally throw an error here if reset failure should stop the test
    // throw new Error(`Failed to reset game state: ${errorBody}`);
  }
}

// Helper: Fetch player state (location, inventory)
async function getPlayerState(userId, storyId) {
  // Use POST /api/game/state with JSON body
  const res = await post('/state', { userId, storyId }, GAME_API);
  return res;
}

// Helper: Retry wrapper for async functions
async function retry(fn, retries = 3, delayMs = 500) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      console.error(`Retry ${i + 1} failed:`, err.message || err);
      if (i < retries - 1) await delay(delayMs);
    }
  }
  throw lastErr;
}

// Helper: Fetch all locations for a story with retry and error handling
let testStoryLogicalId = null;
async function getLocations() {
  if (!testStoryLogicalId) throw new Error('testStoryLogicalId not set');
  return await retry(async () => {
    try {
      const res = await get(`/story-metadata?id=${testStoryLogicalId}`, BASE_API);
      return res.rooms || [];
    } catch (err) {
      console.error('Error fetching locations:', err.message || err);
      throw err;
    }
  });
}

// Helper: Print all stories and metadata for debug
async function debugStoriesAndMetadata(storyId) {
  try {
    const stories = await get('/stories', BASE_API);
    console.log('DEBUG: All stories:', stories.map(s => s.id));
    const meta = await get(`/story-metadata?id=${storyId}`, BASE_API);
    console.log('DEBUG: Metadata for story:', storyId, meta);
  } catch (err) {
    console.error('DEBUG: Error fetching stories/metadata:', err.message || err);
  }
}

// Wrap API calls with error handling
async function safeApiCall(fn, label) {
  try {
    return await fn();
  } catch (err) {
    console.error(`ERROR in ${label}:`, err.message || err);
    return null;
  }
}

// Helper: BFS pathfinding from start to goal
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
        // Use targetLocationId if present, else fallback to target
        const targetId = exit.targetLocationId || exit.target;
        if (targetId && !visited.has(targetId)) {
          queue.push([...path, targetId]);
        }
      }
    }
  }
  return null;
}

// Helper: Move user step-by-step to goal
async function moveUserToGoal(userId, storyId, goalRoomId) {
  const locations = await getLocations();
  const state = await getPlayerState(userId, storyId);
  const startId = state.location.id;
  const path = findPath(locations, startId, goalRoomId);
  if (!path) throw new Error(`No path from ${startId} to ${goalRoomId}`);
  for (let i = 1; i < path.length; i++) {
    const target = path[i];
    console.log(`Moving ${userId} to ${target}...`);
    await post('/move', { userId, target, storyId }, GAME_API);
    await delay(100); // Small delay for realism
  }
}

// Helper: Pick up required artifacts in current room
async function pickupArtifacts(userId, storyId, requiredArtifacts) {
  const state = await getPlayerState(userId, storyId);
  const itemsHere = state.location.items || [];
  const inventory = state.player.inventory || [];
  console.log(`\n[Pickup Debug] User: ${userId}, Room: ${state.location.id}`);
  console.log(`[Pickup Debug] Room items:`, itemsHere);
  console.log(`[Pickup Debug] Required artifacts:`, requiredArtifacts);
  console.log(`[Pickup Debug] Inventory:`, inventory);
  for (const artifact of requiredArtifacts) {
    if (itemsHere.includes(artifact) && !inventory.includes(artifact)) {
      console.log(`Picking up ${artifact} for ${userId}...`);
      try {
        const response = await post('/take', { userId, target: artifact, storyId }, GAME_API);
        console.log(`RESPONSE from /take for ${artifact}:`, response);
        if (!response.success) {
          console.error(`ERROR picking up ${artifact} for ${userId}:`, response);
        }
      } catch (err) {
        console.error(`EXCEPTION picking up ${artifact} for ${userId}:`, err.message || err);
      }
      await delay(100);
    } else if (!itemsHere.includes(artifact)) {
      console.log(`[Pickup Debug] Artifact ${artifact} not present in room ${state.location.id}.`);
    } else if (inventory.includes(artifact)) {
      console.log(`[Pickup Debug] Artifact ${artifact} already in inventory for ${userId}.`);
    }
  }
}

async function run() {
  const errors = [];
  // 1. Create a new test story
  const testTheme = 'Test Adventure (simple win path)';
  console.log('--- Creating Test Story ---');
  const createRes = await safeApiCall(() => post('/stories', { theme: testTheme }, GAME_API), 'create story');
  if (!createRes) { errors.push('Failed to create story'); return; }
  const storyId = createRes.storyId;
  console.log(`Created test story with id: ${storyId}`);
  await debugStoriesAndMetadata(storyId);

  // 2. Start game for test users to ensure they are initialized
  const users = ['neo', 'trinity', 'case', 'molly'];
  for (const user of users) {
    await safeApiCall(() => post('/start', { userId: user, storyId }, GAME_API), `startGame for ${user}`);
  }

  // 3. Reset game state for test users (optional, but keeps test logic consistent)
  for (const user of users) {
    await safeApiCall(() => resetGame(user, storyId), `resetGame for ${user}`);
  }
  await debugStoriesAndMetadata(storyId);

  // 4. Fetch story details
  const story = await safeApiCall(() => get(`/stories/${storyId}`), 'fetch story details');
  if (!story) { errors.push('Failed to fetch story details'); return; }
  const requiredArtifacts = story.requiredArtifacts;
  const goalRoomId = story.goalRoomId;
  testStoryLogicalId = story.id; // Set the logical id for metadata endpoint
  await debugStoriesAndMetadata(storyId);

  // 5. Scenario A: User collects all artifacts and enters goal room step-by-step
  console.log('\n--- Scenario A: Win Path (step-by-step) ---');
  let neoState = await safeApiCall(() => getPlayerState('neo', storyId), 'getPlayerState neo');
  if (!neoState) { errors.push('Failed to get neo state'); return; }
  const locations = await safeApiCall(() => getLocations(), 'getLocations');
  if (!locations) { errors.push('Failed to get locations'); return; }
  console.log('DEBUG: Starting location ID:', neoState.location.id);
  console.log('DEBUG: Goal room ID:', goalRoomId);
  console.log('DEBUG: All room IDs:', locations.map(l => l.id));
  for (const room of locations) {
    console.log(`DEBUG: Room ${room.id} items:`, room.items);
  }
  console.log('DEBUG: Required Artifacts:', requiredArtifacts);

  // Map artifact -> room
  const artifactRoomMap = {};
  for (const artifact of requiredArtifacts) {
    for (const room of locations) {
      if ((room.items || []).includes(artifact)) {
        artifactRoomMap[artifact] = room.id;
        break;
      }
    }
  }
  console.log('DEBUG: Artifact to Room Map:', artifactRoomMap);

  // Build a path: start -> each artifact room (in any order, skipping repeats) -> goal
  const visitedRooms = new Set();
  let currentRoom = neoState.location.id;
  let fullPath = [currentRoom];
  for (const artifact of requiredArtifacts) {
    const artifactRoom = artifactRoomMap[artifact];
    if (artifactRoom && !visitedRooms.has(artifactRoom)) {
      // Find path from currentRoom to artifactRoom
      const subPath = findPath(locations, currentRoom, artifactRoom);
      if (subPath) {
        // Skip the first room (already in fullPath)
        for (let i = 1; i < subPath.length; i++) {
          fullPath.push(subPath[i]);
        }
        currentRoom = artifactRoom;
        visitedRooms.add(artifactRoom);
      } else {
        errors.push(`No path from ${currentRoom} to artifact room ${artifactRoom}`);
      }
    }
  }
  // Finally, path from last artifact room to goal
  if (currentRoom !== goalRoomId) {
    const subPath = findPath(locations, currentRoom, goalRoomId);
    if (subPath) {
      for (let i = 1; i < subPath.length; i++) {
        fullPath.push(subPath[i]);
      }
    } else {
      errors.push(`No path from ${currentRoom} to goal room ${goalRoomId}`);
    }
  }
  console.log('DEBUG: Full path for neo:', fullPath);

  // Move neo through the full path, picking up artifacts in each room
  for (let i = 1; i < fullPath.length; i++) {
    const locId = fullPath[i];
    await safeApiCall(() => moveUserToGoal('neo', storyId, locId), `moveUserToGoal neo to ${locId}`);
    await safeApiCall(() => pickupArtifacts('neo', storyId, requiredArtifacts), `pickupArtifacts neo in ${locId}`);
    // Optionally print inventory after each pickup
    const state = await safeApiCall(() => getPlayerState('neo', storyId), 'getPlayerState neo after pickup');
    if (state) {
      console.log(`DEBUG: neo inventory after ${locId}:`, state.player.inventory);
    }
    await debugStoriesAndMetadata(storyId);
  }

  // 6. Scenario B: User enters goal room without all artifacts
  console.log('\n--- Scenario B: Incomplete Artifacts (step-by-step) ---');
  await safeApiCall(() => moveUserToGoal('trinity', storyId, goalRoomId), 'moveUserToGoal trinity to goal');

  // 7. Scenario C: User loots required artifact(s) in goal room (setup: case has artifact, molly is in goal)
  console.log('\n--- Scenario C: Loot for Win (step-by-step) ---');
  // Move case to artifact, pick up, then to goal
  let caseState = await safeApiCall(() => getPlayerState('case', storyId), 'getPlayerState case');
  if (!caseState) { errors.push('Failed to get case state'); return; }
  for (const artifact of requiredArtifacts) {
    await safeApiCall(() => moveUserToGoal('case', storyId, caseState.location.id), `moveUserToGoal case to ${caseState.location.id}`);
    await safeApiCall(() => pickupArtifacts('case', storyId, [artifact]), `pickupArtifacts case in ${caseState.location.id}`);
  }
  await safeApiCall(() => moveUserToGoal('case', storyId, goalRoomId), 'moveUserToGoal case to goal');
  await safeApiCall(() => moveUserToGoal('molly', storyId, goalRoomId), 'moveUserToGoal molly to goal');
  // Molly kills case
  await safeApiCall(() => post('/kill', { playerId: 'molly', targetId: 'case', storyId }, GAME_API), 'post kill');
  // Molly loots all artifacts from case
  await safeApiCall(() => post('/loot', { playerId: 'molly', targetId: 'case', storyId, items: requiredArtifacts }, GAME_API), 'post loot');
  // Molly moves again to goal to trigger win
  await safeApiCall(() => moveUserToGoal('molly', storyId, goalRoomId), 'moveUserToGoal molly to goal');

  // 8. Fetch leaderboard and assert win states
  const leaderboard = await safeApiCall(() => get(`/leaderboard?storyId=${storyId}`, BASE_API), 'fetch leaderboard');
  if (!leaderboard) { errors.push('Failed to fetch leaderboard'); return; }
  const getStatus = (id) => leaderboard.find(u => u.id === id)?.status;
  console.log('\n--- Test Results ---');
  console.log(`neo: ${getStatus('neo') === 'winner' ? '✅ WIN' : '❌ NOT WINNER'}`);
  console.log(`trinity: ${getStatus('trinity') === 'winner' ? '❌ (should not win)' : '✅ NOT WINNER'}`);
  console.log(`molly: ${getStatus('molly') === 'winner' ? '✅ WIN (via loot)' : '❌ NOT WINNER'}`);
  console.log(`case: ${getStatus('case') === 'winner' ? '❌ (should not win)' : '✅ NOT WINNER'}`);

  if (errors.length) {
    console.error('\n--- ERRORS ENCOUNTERED ---');
    for (const err of errors) console.error(err);
  } else {
    console.log('\n--- TEST COMPLETED WITHOUT ERRORS ---');
  }
}

run(); 