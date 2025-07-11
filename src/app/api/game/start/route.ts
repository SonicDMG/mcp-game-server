import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/astradb';
import logger from '@/lib/logger';
import { PlayerState, Location as GameLocation, Story } from '../types'; // Import necessary types

/**
 * POST /api/game/start
 * Starts a new game session for a user in a specific story or retrieves the existing state if already started.
 * Required for MCP tool operation (MCP 'startGame' operation).
 * May also be used by the frontend for direct API calls.
 */

// --- Fun Username Generation ---
const adjectives = [
  'Adventurous', 'Brave', 'Clever', 'Daring', 'Eager', 'Fearless', 'Gallant', 'Heroic',
  'Intrepid', 'Jolly', 'Keen', 'Lucky', 'Mighty', 'Noble', 'Optimistic', 'Proud', 'Quick',
  'Resourceful', 'Sturdy', 'Tenacious', 'Unflappable', 'Valiant', 'Witty', 'Xenial',
  'Youthful', 'Zealous'
];
const nouns = [
  'Adventurer', 'Badger', 'Capybara', 'Dragon', 'Explorer', 'Fox', 'Griffin', 'Hero',
  'Inventor', 'Jaguar', 'Knight', 'Librarian', 'Mage', 'Navigator', 'Owl', 'Pioneer',
  'Quester', 'Ranger', 'Sorcerer', 'Traveler', 'Unicorn', 'Voyager', 'Wizard', 'Xenops',
  'Yeoman', 'Zephyr'
];

function generateFunUsername(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 90) + 10; // Add a two-digit number
  return `${adj}${noun}${num}`;
}
// --- End Fun Username Generation ---

// Define interfaces for DB records, adding _id where needed
interface PlayerRecord extends PlayerState { _id: string; userId: string; }
interface LocationRecord extends GameLocation { _id: string; }
interface StoryRecord extends Story { _id: string; }

// Get typed collection instances
const playersCollection = db.collection<PlayerRecord>('game_players');
const locationsCollection = db.collection<LocationRecord>('game_locations');
const storiesCollection = db.collection<StoryRecord>('game_stories');

export async function POST(request: NextRequest) {
  logger.info('POST /api/game/start handler started');
  interface StartRequestBody {
    userId?: string;
    storyId?: string;
  }
  let requestBody: StartRequestBody;

  try {
    requestBody = await request.json() as StartRequestBody;
    logger.debug('Start request body:', requestBody);
    // Destructure userId and storyId
    const { userId, storyId } = requestBody;

    // Still require storyId
    if (!storyId) {
      logger.warn('Missing storyId, returning 400');
      return NextResponse.json({ success: false, error: 'Story ID is required' }, { status: 400 });
    }

    // If userId is missing, prompt for username
    if (!userId) {
      return NextResponse.json({
        success: false,
        needsUsername: true,
        message: "Please enter your desired username to begin playing."
      }, { status: 200 });
    } else {
      logger.debug(`Received userId: ${userId}`);
    }

    logger.debug(`Processing start request for userId: ${userId}, storyId: ${storyId}`);

    // Construct the unique player document ID
    const playerDocId = `${storyId}_${userId}`;

    // 1. Check if player already exists
    let player = await playersCollection.findOne({ _id: playerDocId });
    let message = "Welcome back!";
    let story: StoryRecord | null = null;

    if (player) {
      logger.info(`Player ${playerDocId} found. Retrieving state.`);
      message = "Welcome back! Resuming your adventure.";
      // Fetch story for goals
      story = await storiesCollection.findOne({ id: storyId });
    } else {
      // Ensure we generated a user ID if the player wasn't found and no ID was given
      if (!userId) {
          // This case should theoretically not be reached due to the generation above, but it's a safeguard.
          logger.error("Critical error: Player not found and userId is somehow missing.");
          return NextResponse.json({ success: false, error: 'Internal server error: User ID could not be determined.' }, { status: 500 });
      }
      logger.info(`Player ${playerDocId} not found. Creating new game state.`);
      
      // 2. If player doesn't exist, fetch the story to get starting location
      story = await storiesCollection.findOne({ id: storyId }); // Find story by its logical ID
      if (!story) {
        logger.error(`Story with id ${storyId} not found.`);
        return NextResponse.json({ success: false, error: `Story '${storyId}' not found.` }, { status: 404 });
      }
      
      if (!story.startingLocation) {
         logger.error(`Story ${storyId} is missing a startingLocation.`);
         return NextResponse.json({ success: false, error: `Story '${storyId}' is not configured correctly (missing start).` }, { status: 500 });
      }

      // 3. Create the new player state document
      const newPlayer: PlayerRecord = {
        _id: playerDocId,       // Database document ID
        id: userId,             // Logical player ID
        userId: userId,
        storyId: storyId,
        currentLocation: story.startingLocation,
        inventory: [],
        discoveredLocations: [story.startingLocation],
        gameProgress: {
          itemsFound: [],
          puzzlesSolved: [],
          storyProgress: 0
        }
      };
      
      // Insert the new player document
      const insertResult = await playersCollection.insertOne(newPlayer);
      logger.info(`New player created with result:`, insertResult);
      
      // Use the newly created player object for the response
      player = newPlayer; 
      // Adjust welcome message based on whether the user ID was generated
      message = userId === generateFunUsername() 
          ? `Welcome, new adventurer (User ID: ${userId})! Your journey in "${story.title}" begins now.` 
          : `Welcome to "${story.title}"! Your adventure begins now.`;
    }

    // 4. Fetch the player's current location details (either existing or starting)
    const currentLocation = await locationsCollection.findOne({ id: player.currentLocation, storyId: storyId });
    
    logger.debug('Raw currentLocation fetched from DB:', currentLocation);

    if (!currentLocation) {
      logger.error(`Critical Error: Location ${player.currentLocation} for story ${storyId} not found for player ${playerDocId}.`);
      // This shouldn't happen if data is consistent, but handle it just in case.
      return NextResponse.json({ success: false, error: 'Internal error: Player\'s current location data is missing.' }, { status: 500 });
    }

    // 5. Prepare and return the response
    // Omit _id from player and location in the response for cleaner output
    const { _id: player_id, ...playerResponse } = player;
    const { _id: location_id, ...locationResponse } = currentLocation;

    // Prepare goals/objectives summary from story
    let goals = undefined;
    if (story) {
      goals = {
        challenges: Array.isArray(story.challenges)
          ? story.challenges.map(c => ({ id: c.id, name: c.name, description: c.description }))
          : [],
        requiredArtifacts: story.requiredArtifacts || [],
        goalRoomId: story.goalRoomId || null
      };
    }

    logger.info(`Start successful for ${playerDocId}. Current location: ${locationResponse.id}`);

    return NextResponse.json({
      success: true,
      storyId: storyId,
      userId: userId,
      message: message,
      player: playerResponse,
      location: locationResponse,
      goals
    });

  } catch (error) {
    logger.error('Error in start handler:', error);
    let errorMessage = 'Failed to start game due to an internal error.';
    const status = 500;
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
       // Handle potential string errors from DB client?
       errorMessage = error;
    }
    // Handle JSON parsing error specifically
    if (error instanceof SyntaxError) {
        logger.error('Bad JSON format received');
        errorMessage = "Invalid request format. Please send valid JSON.";
        return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status });
  }
} 