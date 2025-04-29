#!/usr/bin/env node

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

async function run() {
  let selectedStory = null;
  let storyIdToUse = null;
  // Define the user ID we want to reset/test primarily
  const testUserId = 'neo';

  try {
    console.log("--- Fetching Available Stories ---");
    const storiesResult = await get('/stories'); // Fetch all stories
    // Ensure the response is in the expected format (array or object with data)
    const availableStories = storiesResult?.data || storiesResult; // Adapt based on actual API response structure

    if (!Array.isArray(availableStories) || availableStories.length === 0) {
        throw new Error("No stories found in the database or invalid response format.");
    }

    // Select the first story for the test
    selectedStory = availableStories[0];
    // Use the story's logical ID for reset/gameplay identification
    // Assuming the fetched stories include the 'id' field now
    storyIdToUse = selectedStory.id;

    if (!storyIdToUse) {
        throw new Error("Selected story is missing an id."); // Check for 'id'
    }

    console.log(`--- Using Story: \"${selectedStory.title}\" (ID: ${storyIdToUse}) ---`);

  } catch (error) {
    console.error("Failed to fetch or select a story:", error);
    console.log("Exiting test due to story fetch failure.");
    return; // Stop the test if we can't get a story
  }

  console.log("--- Resetting Game State ---");
  // Call reset for all players involved in the test
  await resetGame('neo', storyIdToUse);
  await resetGame('trinity', storyIdToUse);
  await resetGame('case', storyIdToUse);
  await resetGame('molly', storyIdToUse);

  console.log("--- Running Player Simulations (Mystic Library Path) ---");

  // Updated path based on library definition
  // Starting in 'library'

  // neo's path
  console.log("Neo attempting moves...");
  // 1. Take silver_key from library (Use GAME_API)
  await post('/take', { userId: 'neo', target: 'silver_key', storyId: storyIdToUse }, GAME_API); 
  // 2. Move to hallway (Use GAME_API)
  await post('/move', { userId: 'neo', target: 'hallway', storyId: storyIdToUse }, GAME_API);
  // TODO: Check hallway definition for next steps (items/exits)
  // Assuming hallway has treasure_room exit and nothing to take for now
  // 3. Move to treasure_room (requires silver_key, Use GAME_API)
  await post('/move', { userId: 'neo', target: 'treasure_room', storyId: storyIdToUse }, GAME_API);
  // TODO: Check treasure_room definition
  // Assuming treasure_room has golden_goblet
  // 4. Take golden_goblet (Use GAME_API)
  await post('/take', { userId: 'neo', target: 'golden_goblet', storyId: storyIdToUse }, GAME_API);
  // Assuming treasure_room is the goal/win condition? Adjust if needed.

  // trinity:
  console.log("Trinity attempting moves...");
  // 1. Take silver_key from library (Use GAME_API)
  await post('/take', { userId: 'trinity', target: 'silver_key', storyId: storyIdToUse }, GAME_API);
  // 2. Move to hallway (Use GAME_API)
  await post('/move', { userId: 'trinity', target: 'hallway', storyId: storyIdToUse }, GAME_API);

  // case:
  console.log("Case attempting moves...");
  // 1. Move to hallway (Use GAME_API)
  await post('/move', { userId: 'case', target: 'hallway', storyId: storyIdToUse }, GAME_API);

  // molly:
  console.log("Molly attempting moves...");
  // 1. Move to hallway (Use GAME_API)
  await post('/move', { userId: 'molly', target: 'hallway', storyId: storyIdToUse }, GAME_API);


  // Wait for all actions to process
  await delay(500);

  console.log("--- Fetching Leaderboard ---");
  // Leaderboard is under BASE_API and now requires storyId query param
  const leaderboard = await get(`/leaderboard?storyId=${storyIdToUse}`, BASE_API);
  console.log('\nFinal Leaderboard:');
  leaderboard.forEach(u => {
    // Assuming response has id, inventory, room, reachedGoal
    console.log(`- ${u.id}: ${u.inventory?.join(', ') || 'No artifacts'} | Room: ${u.room} | ${u.reachedGoal ? '🏁 Goal Reached!' : ''}`);
  });
}

run(); 