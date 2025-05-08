#!/usr/bin/env node

// story-challenge-test.js: Challenge-based artifact acquisition scenario test
// (Split from story-test.js, with dependency handling)

import {
  post, get, resetGame, getPlayerState, retry, getLocations, debugStoriesAndMetadata, safeApiCall, findPath, moveUserToGoal, pickupArtifacts, delay, GAME_API, BASE_API, setTestStoryLogicalId
} from './test-helpers.js';

// --- Enhanced Challenge Test with Dependency Handling ---
async function testChallengeArtifactAcquisition() {
  const errors = [];
  const testTheme = 'Challenge Labyrinth';
  console.log('\n--- Creating Challenge Test Story ---');
  const createRes = await safeApiCall(() => post('/stories', { theme: testTheme }, GAME_API), 'create challenge story');
  if (!createRes) { errors.push('Failed to create challenge story'); return; }
  const storyId = createRes.storyId;
  console.log(`Created challenge test story with id: ${storyId}`);
  await debugStoriesAndMetadata(storyId);

  // Start a player
  const user = 'challenge_tester';
  await safeApiCall(() => post('/start', { userId: user, storyId }, GAME_API), `startGame for ${user}`);
  await safeApiCall(() => resetGame(user, storyId), `resetGame for ${user}`);

  // Fetch story details
  const story = await safeApiCall(() => get(`/stories/${storyId}`), 'fetch challenge story details');
  if (!story) { errors.push('Failed to fetch challenge story details'); return; }
  const requiredArtifacts = story.requiredArtifacts;
  const goalRoomId = story.goalRoomId;
  setTestStoryLogicalId(story.id);
  await debugStoriesAndMetadata(storyId);
  const locations = await safeApiCall(() => getLocations(), 'getLocations');

  // Fetch challenges
  const challenges = story.challenges || [];
  if (!challenges.length) {
    errors.push('No challenges found in generated story');
    return;
  }
  console.log('Found challenges:', challenges.map(c => c.name));

  // Helper: Recursively solve prerequisite challenges for required artifacts
  async function solveChallengeByArtifact(artifactId, solvedSet = new Set()) {
    // Find the challenge that awards this artifact
    const challenge = challenges.find(c => c.artifactId === artifactId);
    if (!challenge) {
      console.warn(`No challenge found awarding artifact: ${artifactId}`);
      return;
    }
    if (solvedSet.has(challenge.id)) return; // Prevent infinite loops
    solvedSet.add(challenge.id);
    // Handle item requirements (recursively solve if required item is a required artifact)
    if (challenge.requirements && challenge.requirements.item) {
      const requiredItem = challenge.requirements.item;
      if (requiredArtifacts.includes(requiredItem)) {
        // Recursively solve prerequisite challenge
        await solveChallengeByArtifact(requiredItem, solvedSet);
      } else {
        // Pick up the required item if it's not a required artifact
        const itemLocation = locations.find(loc => (loc.items || []).includes(requiredItem));
        if (itemLocation) {
          console.log(`Moving to required item location: ${itemLocation.id} for item: ${requiredItem}`);
          await safeApiCall(() => moveUserToGoal(user, storyId, itemLocation.id), `moveUserToGoal ${user} to ${itemLocation.id}`);
          await safeApiCall(() => pickupArtifacts(user, storyId, [requiredItem]), `pickupArtifacts ${user} in ${itemLocation.id}`);
        } else {
          console.warn(`Required item ${requiredItem} for challenge ${challenge.id} not found in any location.`);
        }
      }
    }
    // Move to challenge location and attempt the challenge
    console.log(`\n--- Moving to challenge location: ${challenge.locationId} ---`);
    await safeApiCall(() => moveUserToGoal(user, storyId, challenge.locationId), `moveUserToGoal ${user} to ${challenge.locationId}`);
    // Attempt to solve challenge
    let answer = '';
    if (challenge.solution) answer = challenge.solution.split(/[,.;]/)[0];
    else if (challenge.completionCriteria) answer = challenge.completionCriteria.split(/[,.;]/)[0];
    else answer = 'unknown';
    const attemptRes = await safeApiCall(() => post('/action', {
      playerId: user,
      storyId,
      action: 'attempt_challenge',
      challengeId: challenge.id,
      answer
    }, GAME_API), `attempt_challenge for ${challenge.id}`);
    if (attemptRes && attemptRes.success) {
      console.log(`SUCCESS: Challenge '${challenge.name}' completed, artifact awarded: ${attemptRes.artifactId}`);
    } else {
      errors.push(`Failed to complete challenge '${challenge.name}': ${attemptRes && attemptRes.error}`);
    }
    // Check inventory
    const state = await safeApiCall(() => getPlayerState(user, storyId), `getPlayerState ${user} after challenge`);
    if (state) {
      console.log(`Inventory after challenge:`, state.player.inventory);
    }
  }

  // Attempt to solve all challenges for required artifacts
  for (const artifact of requiredArtifacts) {
    await solveChallengeByArtifact(artifact);
  }

  // Move player to the final room after collecting all required artifacts
  console.log(`Moving player to the final room: ${goalRoomId}`);
  await safeApiCall(() => moveUserToGoal(user, storyId, goalRoomId), `moveUserToGoal ${user} to final room (${goalRoomId})`);

  if (errors.length) {
    console.error('\n--- CHALLENGE TEST ERRORS ---');
    for (const err of errors) console.error(err);
  } else {
    console.log('\n--- CHALLENGE TEST COMPLETED WITHOUT ERRORS ---');
  }
}

testChallengeArtifactAcquisition(); 