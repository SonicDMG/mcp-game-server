#!/usr/bin/env node

// story-winpath-test.js: Original win-path scenario test for artifact collection and win logic
// (Split from story-test.js)

import {
  post, get, resetGame, getPlayerState, retry, getLocations, debugStoriesAndMetadata, safeApiCall, findPath, moveUserToGoal, pickupArtifacts, delay, GAME_API, BASE_API, setTestStoryLogicalId
} from './test-helpers.js';

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
  setTestStoryLogicalId(story.id);
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