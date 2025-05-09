#!/usr/bin/env node

// finaltask-winpath-test.js: Integration test for the finalTask win condition
// (Patterned after story-winpath-test.js)

import {
  post, get, resetGame, getPlayerState, retry, getLocations, debugStoriesAndMetadata, safeApiCall, findPath, moveUserToGoal, pickupArtifacts, delay, GAME_API, BASE_API, setTestStoryLogicalId
} from './test-helpers.js';

async function run() {
  const errors = [];
  // 1. Create a new test story with a finalTask
  const testTheme = 'Alien Dropship Escape (final task)';
  console.log('--- Creating Test Story with finalTask ---');
  const createRes = await safeApiCall(() => post('/stories', { theme: testTheme }, GAME_API), 'create story');
  if (!createRes) { errors.push('Failed to create story'); return; }
  const storyId = createRes.storyId;
  console.log(`Created test story with id: ${storyId}`);
  await debugStoriesAndMetadata(storyId);

  // 2. Start game for test user
  const user = 'finalist';
  await safeApiCall(() => post('/start', { userId: user, storyId }, GAME_API), `startGame for ${user}`);
  await safeApiCall(() => resetGame(user, storyId), `resetGame for ${user}`);
  await debugStoriesAndMetadata(storyId);

  // 3. Fetch story details
  const story = await safeApiCall(() => get(`/stories/${storyId}`), 'fetch story details');
  if (!story) { errors.push('Failed to fetch story details'); return; }
  const finalTask = story.finalTask;
  if (!finalTask) { errors.push('Story does not have a finalTask'); return; }
  const requiredArtifacts = finalTask.requiredArtifacts;
  const finalLocation = finalTask.locationId;
  setTestStoryLogicalId(story.id);
  await debugStoriesAndMetadata(storyId);

  // 4. Scenario A: User collects all finalTask artifacts and moves to finalTask location
  console.log('\n--- Scenario A: FinalTask Win Path ---');
  let state = await safeApiCall(() => getPlayerState(user, storyId), 'getPlayerState finalist');
  if (!state) { errors.push('Failed to get user state'); return; }
  const locations = await safeApiCall(() => getLocations(), 'getLocations');
  if (!locations) { errors.push('Failed to get locations'); return; }
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
  // Move and pick up each artifact
  let currentRoom = state.location.id;
  for (const artifact of requiredArtifacts) {
    const artifactRoom = artifactRoomMap[artifact];
    if (artifactRoom && currentRoom !== artifactRoom) {
      const subPath = findPath(locations, currentRoom, artifactRoom);
      if (subPath) {
        for (let i = 1; i < subPath.length; i++) {
          await safeApiCall(() => moveUserToGoal(user, storyId, subPath[i]), `moveUserToGoal ${user} to ${subPath[i]}`);
        }
        currentRoom = artifactRoom;
      } else {
        errors.push(`No path from ${currentRoom} to artifact room ${artifactRoom}`);
      }
    }
    await safeApiCall(() => pickupArtifacts(user, storyId, [artifact]), `pickupArtifacts ${user} in ${artifactRoom}`);
  }
  // Move to finalTask location
  if (currentRoom !== finalLocation) {
    const subPath = findPath(locations, currentRoom, finalLocation);
    if (subPath) {
      for (let i = 1; i < subPath.length; i++) {
        await safeApiCall(() => moveUserToGoal(user, storyId, subPath[i]), `moveUserToGoal ${user} to ${subPath[i]}`);
      }
      currentRoom = finalLocation;
    } else {
      errors.push(`No path from ${currentRoom} to finalTask location ${finalLocation}`);
    }
  }
  // Trigger win by moving or taking action in finalTask location
  const winState = await safeApiCall(() => getPlayerState(user, storyId), 'getPlayerState after finalTask move');
  if (winState && winState.player.status === 'winner') {
    console.log('✅ WIN: Player completed the final epic task and won the game!');
  } else {
    errors.push('❌ Player did not win after completing finalTask requirements');
  }

  // 5. Scenario B: User missing artifact or in wrong location
  console.log('\n--- Scenario B: Incomplete FinalTask ---');
  const user2 = 'almostfinal';
  await safeApiCall(() => post('/start', { userId: user2, storyId }, GAME_API), `startGame for ${user2}`);
  await safeApiCall(() => resetGame(user2, storyId), `resetGame for ${user2}`);
  // Pick up only some artifacts
  let state2 = await safeApiCall(() => getPlayerState(user2, storyId), 'getPlayerState almostfinal');
  if (!state2) { errors.push('Failed to get user2 state'); return; }
  let partialRoom = state2.location.id;
  for (let i = 0; i < requiredArtifacts.length - 1; i++) {
    const artifact = requiredArtifacts[i];
    const artifactRoom = artifactRoomMap[artifact];
    if (artifactRoom && partialRoom !== artifactRoom) {
      const subPath = findPath(locations, partialRoom, artifactRoom);
      if (subPath) {
        for (let j = 1; j < subPath.length; j++) {
          await safeApiCall(() => moveUserToGoal(user2, storyId, subPath[j]), `moveUserToGoal ${user2} to ${subPath[j]}`);
        }
        partialRoom = artifactRoom;
      }
    }
    await safeApiCall(() => pickupArtifacts(user2, storyId, [artifact]), `pickupArtifacts ${user2} in ${artifactRoom}`);
  }
  // Move to finalTask location
  if (partialRoom !== finalLocation) {
    const subPath = findPath(locations, partialRoom, finalLocation);
    if (subPath) {
      for (let i = 1; i < subPath.length; i++) {
        await safeApiCall(() => moveUserToGoal(user2, storyId, subPath[i]), `moveUserToGoal ${user2} to ${subPath[i]}`);
      }
      partialRoom = finalLocation;
    }
  }
  // Check win state
  const notWinState = await safeApiCall(() => getPlayerState(user2, storyId), 'getPlayerState after incomplete finalTask');
  if (notWinState && notWinState.player.status !== 'winner') {
    console.log('✅ NOT WINNER: Player did not win without all finalTask artifacts');
  } else {
    errors.push('❌ Player incorrectly won without all finalTask artifacts');
  }

  // 6. Print results
  if (errors.length) {
    console.error('\n--- ERRORS ENCOUNTERED ---');
    for (const err of errors) console.error(err);
  } else {
    console.log('\n--- FINAL TASK TEST COMPLETED WITHOUT ERRORS ---');
  }
}

run(); 