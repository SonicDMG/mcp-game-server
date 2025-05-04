import { GameItem, Location as GameLocation, PlayerState, Story } from './types';

// Define interfaces for DB records adding _id 
// Ensure these align with the actual data structures and types.ts
export interface ItemRecord extends GameItem { _id: string; }
interface LocationRecord extends GameLocation { _id: string; }
interface PlayerRecord extends PlayerState { _id: string; }
interface StoryRecord extends Story { _id: string; }

// Get story by ID (using logical ID)
export async function getStory(storyId: string): Promise<StoryRecord | null> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const db = require('@/lib/astradb').default;
  const storiesCollection = db.collection('game_stories');
  try {
    // Find story by its logical id field
    const result = await storiesCollection.findOne({ id: storyId });
    return result;
  } catch (error) {
    console.error(`Error getting story with id ${storyId}:`, error);
    return null;
  }
}

// Get or create player state (uses logical player ID)
export async function getPlayerState(userId: string, storyId: string): Promise<PlayerRecord | null> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const db = require('@/lib/astradb').default;
  const playersCollection = db.collection('game_players');
  const playerDocId = `${storyId}_${userId}`; // Construct the document _id
  try {
    const playerState = await playersCollection.findOne({ _id: playerDocId });
    if (playerState) {
      return playerState;
    }
    // Player not found, create new one
    console.log(`Player ${playerDocId} not found, creating new state...`);
    const story = await getStory(storyId);
    if (!story) {
      console.error(`Cannot create player: Story ${storyId} not found.`);
      return null;
    }
    // Create new player document data (without _id)
    const newPlayerData: Omit<PlayerRecord, '_id'> = {
      id: userId, // Logical user ID
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
    // Insert the new player with the constructed _id
    const result = await playersCollection.insertOne({ ...newPlayerData, _id: playerDocId });
    console.log(`New player ${playerDocId} created, insertedId: ${result.insertedId}`);
    // Return the full player state including the _id
    return { ...newPlayerData, _id: playerDocId };
  } catch (error) {
    console.error(`Error getting/creating player state for ${playerDocId}:`, error);
    return null;
  }
}

// Update player state (using full PlayerRecord including _id)
export async function updatePlayerState(player: PlayerRecord): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const db = require('@/lib/astradb').default;
  const playersCollection = db.collection('game_players');
  try {
    // Extract _id and the rest of the data for replacement
    const { _id, ...playerData } = player;
    const filter = { _id: _id }; 
    // Use replaceOne to overwrite the document with the new state
    const result = await playersCollection.replaceOne(filter, playerData);
    console.log(`Updated player ${_id}. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
    // Check if the document was found and replaced
    return result.modifiedCount === 1;
  } catch (error) {
    console.error(`Error updating player state for ${player._id}:`, error);
    return false;
  }
}

// Get location by logical ID for a specific story
export async function getLocation(locationId: string, storyId: string): Promise<LocationRecord | null> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const db = require('@/lib/astradb').default;
  const locationsCollection = db.collection('game_locations');
  try {
    const location = await locationsCollection.findOne({ id: locationId, storyId: storyId });
    return location;
  } catch (error) {
    console.error(`Error getting location ${locationId} for story ${storyId}:`, error);
    return null;
  }
}

// Get item by logical ID for a specific story
export async function getItem(itemId: string, storyId: string): Promise<ItemRecord | null> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const db = require('@/lib/astradb').default;
  const itemsCollection = db.collection('game_items');
  try {
    const item = await itemsCollection.findOne({ id: itemId, storyId: storyId });
    return item;
  } catch (error) {
    console.error(`Error getting item ${itemId} for story ${storyId}:`, error);
    return null;
  }
} 