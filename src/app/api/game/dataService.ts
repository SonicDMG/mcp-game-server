import { GameItem, Location as GameLocation, PlayerState, Story } from './types';
import db from '@/lib/astradb'; // Import the initialized Db instance

// Define interfaces for DB records adding _id 
// Ensure these align with the actual data structures and types.ts
interface ItemRecord extends GameItem { _id: string; }
interface LocationRecord extends GameLocation { _id: string; }
interface PlayerRecord extends PlayerState { _id: string; }
interface StoryRecord extends Story { _id: string; }

// Get typed collection instances
const storiesCollection = db.collection<StoryRecord>('game_stories');
const itemsCollection = db.collection<ItemRecord>('game_items');
const locationsCollection = db.collection<LocationRecord>('game_locations');
const playersCollection = db.collection<PlayerRecord>('game_players');

// Get story by ID (using logical ID)
export async function getStory(storyId: string): Promise<StoryRecord | null> {
  try {
    // Find story by its logical id field
    const result = await storiesCollection.findOne({ id: storyId });
    return result;
  } catch (error) {
    console.error(`Error getting story with id ${storyId}:`, error);
    return null;
  }
}

// Initialize game items for a specific story
export async function initializeGameItems(storyId: string) {
  // Define items with logical IDs, let DB generate _id or construct if needed
  const itemsToCreate: Omit<ItemRecord, '_id'>[] = [
    {
      id: 'silver_key',
      storyId: storyId,
      name: 'Silver Key',
      description: 'An ornate silver key with mysterious engravings.',
      canTake: true,
      canUse: true,
      useWith: ['locked_chest']
    },
     {
      id: 'golden_goblet',
      storyId: storyId,
      name: 'Golden Goblet',
      description: 'A heavy golden goblet, perhaps valuable.',
      canTake: true,
      canUse: false,
    },
    {
      id: 'locked_chest',
      storyId: storyId,
      name: 'Locked Chest',
      description: 'A sturdy wooden chest, firmly locked.',
      canTake: false,
      canUse: false,
    }
    // Add more items for the story here
  ];

  try {
    // Optional: Delete existing items for this storyId first for idempotency?
    // await itemsCollection.deleteMany({ storyId: storyId });
    
    console.log(`Initializing/updating ${itemsToCreate.length} items for story ${storyId}...`);
    // Use bulk operations if available and suitable, or individual upserts
    const promises = itemsToCreate.map(itemData => {
      // Use updateOne with upsert:true to create if not exists, or update if exists based on id+storyId
      return itemsCollection.updateOne(
        { id: itemData.id, storyId: storyId }, 
        { $set: itemData }, 
        { upsert: true }
      );
    });
    const results = await Promise.all(promises);
    console.log('Item initialization results:', results.map(r => ({ matched: r?.matchedCount, modified: r?.modifiedCount, upserted: r?.upsertedId })));
    return true;
  } catch (error) {
    console.error(`Failed to initialize game items for story ${storyId}:`, error);
    return false;
  }
}

// Initialize game locations for a specific story
export async function initializeGameLocations(storyId: string) {
  const locationsToCreate: Omit<LocationRecord, '_id'>[] = [
    {
      id: 'library',
      storyId: storyId,
      name: 'Ancient Library',
      description: 'A vast library filled with dusty tomes. Moonlight filters through stained glass windows.',
      items: ['silver_key'], // Initial items
      exits: ['hallway', 'secret_passage'],
      requirements: { condition: 'none' }
    },
    {
      id: 'hallway',
      storyId: storyId,
      name: 'Dimly Lit Hallway',
      description: 'A long hallway with flickering torches. The air is thick with mystery.',
      items: [],
      exits: ['library', 'study'], // Assuming 'study' exists or will be added
      requirements: { condition: 'none' }
    },
    {
      id: 'secret_passage',
      storyId: storyId,
      name: 'Secret Passage',
      description: 'A narrow passage hidden behind a bookshelf. Cobwebs line the walls.',
      items: [],
      exits: ['library', 'treasure_room'], // Assuming 'treasure_room' exists or will be added
      requirements: { item: 'silver_key', condition: 'unlocked' }
    },
    // Add treasure_room, study, etc.
    {
      id: 'treasure_room',
      storyId: storyId,
      name: 'Treasure Room',
      description: 'A magnificent room filled with sparkling treasures! You see a golden goblet.',
      items: ['golden_goblet'],
      exits: ['hallway'],
      requirements: { item: 'silver_key' } // Requires key to enter
    }
  ];

  try {
    // Optional: Delete existing locations for this storyId first?
    // await locationsCollection.deleteMany({ storyId: storyId });

    console.log(`Initializing/updating ${locationsToCreate.length} locations for story ${storyId}...`);
    const promises = locationsToCreate.map(locationData => {
       // Use updateOne with upsert:true
      return locationsCollection.updateOne(
        { id: locationData.id, storyId: storyId }, 
        { $set: locationData }, 
        { upsert: true }
      );
    });
    const results = await Promise.all(promises);
     console.log('Location initialization results:', results.map(r => ({ matched: r?.matchedCount, modified: r?.modifiedCount, upserted: r?.upsertedId })));
    return true;
  } catch (error) {
    console.error(`Failed to initialize game locations for story ${storyId}:`, error);
    return false;
  }
}

// Get or create player state (uses logical player ID)
export async function getPlayerState(userId: string, storyId: string): Promise<PlayerRecord | null> {
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
  try {
    const item = await itemsCollection.findOne({ id: itemId, storyId: storyId });
    return item;
  } catch (error) {
    console.error(`Error getting item ${itemId} for story ${storyId}:`, error);
    return null;
  }
}

// Initialize game data (items and locations) for a specific story
export async function initializeGameData(storyId: string): Promise<boolean> {
  console.log(`Initializing all game data for story: ${storyId}`);
  try {
    const itemsInitialized = await initializeGameItems(storyId);
    const locationsInitialized = await initializeGameLocations(storyId);
    if (!itemsInitialized || !locationsInitialized) {
        throw new Error('Partial initialization failure.');
    }
    console.log(`Successfully initialized items and locations for story: ${storyId}`);
    return true;
  } catch (error) {
    console.error(`Error initializing game data for story ${storyId}:`, error);
    return false;
  }
} 