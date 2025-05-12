#!/usr/bin/env node

// messaging-scenario-test.js: Test live and polled messaging between two players in an existing story

import {
  post, get, resetGame, getPlayerState, delay, GAME_API, BASE_API, safeApiCall
} from './test-helpers.js';

async function findExistingStory() {
  const stories = await safeApiCall(() => get('/stories', GAME_API), 'get stories');
  if (!stories || !stories.length) throw new Error('No stories found');
  // Look for a story with 'test' in the title (case-insensitive)
  const testStory = stories.find(s => s.title && s.title.toLowerCase().includes('test'));
  if (!testStory) throw new Error('No story with "test" in the title found');
  return testStory;
}

async function ensurePlayer(userId, storyId) {
  // Try to start the game for the user (idempotent)
  await safeApiCall(() => post('/start', { userId, storyId }, GAME_API), `startGame for ${userId}`);
  // Optionally reset state for a clean test
  await safeApiCall(() => resetGame(userId, storyId), `resetGame for ${userId}`);
}

async function sendMessage(userId, storyId, message) {
  return await safeApiCall(() => post('/message', { userId, storyId, message }, GAME_API), `sendMessage from ${userId}`);
}

async function pollMessages(userId, storyId) {
  return await safeApiCall(() => post('/message/poll', { userId, storyId }, GAME_API), `pollMessages for ${userId}`);
}

async function peekMessages(userId, storyId) {
  return await safeApiCall(() => post('/message/peek', { userId, storyId }, GAME_API), `peekMessages for ${userId}`);
}

async function getUserState(userId, storyId) {
  // Fetch the user's current state, including location and exits
  return await safeApiCall(() => get(`/state/${storyId}/${userId}`, GAME_API), `getUserState for ${userId}`);
}

async function lookUser(userId, storyId) {
  // Call the look endpoint for the user
  return await safeApiCall(() => post('/look', { userId, storyId }, GAME_API), `look user ${userId}`);
}

async function checkHasMessages(userId, storyId) {
  // Calls the same API as the frontend utility
  const res = await post('/move', { userId, storyId, checkOnly: true }, GAME_API);
  // The move endpoint should return hasMessages in the response
  return res.hasMessages;
}

async function messagingScenarioTest() {
  const errors = [];
  console.log('\n--- Messaging Scenario Test ---');
  const story = await findExistingStory();
  const storyId = story.id || story.storyId || story._id;
  console.log(`Using story: ${story.title} (${storyId})`);

  const user1 = 'msg_user1';
  const user2 = 'msg_user2';

  await ensurePlayer(user1, storyId);
  await ensurePlayer(user2, storyId);

  // Before sending any messages, register both users with a dummy poll request
  await pollMessages(user1, storyId); // Register user1
  await pollMessages(user2, storyId); // Register user2

  // User 1 sends a message
  const msg1 = 'Hello from user1!';
  const sendRes1 = await sendMessage(user1, storyId, msg1);
  console.log('sendMessage user1 ->', sendRes1);
  await delay(300); // Allow for propagation

  // User2 performs a look action
  const lookRes1 = await lookUser(user2, storyId);
  console.log('look user2 ->', lookRes1);

  // User2 should have received the message in the first look
  if (!lookRes1 || !lookRes1.messages || !lookRes1.messages.some(m => m.message === msg1)) {
    errors.push('User2 did not receive message from user1');
  } else {
    console.log('User2 received:', lookRes1.messages.map(m => m.message));
  }

  // User2 performs another look action
  const lookRes2 = await lookUser(user2, storyId);
  console.log('look user2 again ->', lookRes2);

  // Check hasMessages for user2 (should be false)
  const hasMsg2 = lookRes2 && lookRes2.hasMessages;
  if (hasMsg2) {
    errors.push('User2 should have hasMessages=false after polling and looking again');
  } else {
    console.log('User2 hasMessages after polling and look (should be false):', hasMsg2);
  }

  // User 2 replies
  const msg2 = 'Hi user1, this is user2!';
  const sendRes2 = await sendMessage(user2, storyId, msg2);
  console.log('sendMessage user2 ->', sendRes2);
  await delay(300);

  // User 1 polls for messages
  const poll1 = await pollMessages(user1, storyId);
  if (!poll1 || !poll1.messages || !poll1.messages.some(m => m.message === msg2)) {
    errors.push('User1 did not receive message from user2');
  } else {
    console.log('User1 received:', poll1.messages.map(m => m.message));
  }

  // Optionally, test peek endpoint
  const peek1 = await peekMessages(user1, storyId);
  const peek2 = await peekMessages(user2, storyId);
  console.log('Peek user1:', peek1);
  console.log('Peek user2:', peek2);

  if (errors.length) {
    console.error('\n--- MESSAGING TEST ERRORS ---');
    for (const err of errors) console.error(err);
    process.exit(1);
  } else {
    console.log('\n--- MESSAGING TEST COMPLETED WITHOUT ERRORS ---');
  }
}

messagingScenarioTest(); 