import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/astradb';
// Assuming types are defined correctly elsewhere, adjust imports as needed
import { Location as GameLocation, Story } from '../game/types'; 

// Interfaces for DB Records
interface StoryRecord extends Story { 
  _id: string; 
  // Add fields assumed to be in the story document based on previous metadata structure
  roomOrder?: string[];
  artifacts?: string[];
  goalRoom?: string;
  requiredArtifacts?: string[];
}
interface LocationRecord extends GameLocation { _id: string; }

// Collections
const storiesCollection = db.collection<StoryRecord>('game_stories');
const locationsCollection = db.collection<LocationRecord>('game_locations');
// Potentially need itemsCollection if artifacts aren't stored directly in story
// const itemsCollection = db.collection('game_items');

// Define a specific type for the Room data returned in the response
// (Omitting _id and storyId from the DB record type)
type ResponseRoom = Omit<GameLocation, 'storyId'>;

// Define the structure expected by the frontend (matching previous structure)
// May need adjustment based on actual frontend consumption
interface StoryMetadataResponse {
  title: string;
  description: string;
  roomOrder: string[];
  artifacts: string[];
  goalRoom: string;
  rooms: ResponseRoom[]; // Use the specific ResponseRoom type
  requiredArtifacts: string[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storyId = searchParams.get('id');

  if (!storyId) {
    // Return default story if no ID is provided, or handle as an error
    // For now, defaulting to mystic_library for compatibility with current frontend
    console.warn('No story ID provided to /api/story-metadata, defaulting to mystic_library');
    // You might want to return an error instead: 
    // return NextResponse.json({ error: 'Story ID is required' }, { status: 400 });
    const defaultStoryId = 'mystic_library';
    return await fetchAndFormatMetadata(defaultStoryId);
  }

  return await fetchAndFormatMetadata(storyId);
}

async function fetchAndFormatMetadata(storyId: string) {
  console.log(`Fetching metadata for story: ${storyId}`);
  try {
    // 1. Fetch Story Document
    const story = await storiesCollection.findOne({ id: storyId });
    if (!story) {
      return NextResponse.json({ error: `Story with id ${storyId} not found` }, { status: 404 });
    }

    // 2. Fetch Associated Locations
    const locations = await locationsCollection.find({ storyId: storyId }).toArray();
    if (!locations || locations.length === 0) {
      console.warn(`No locations found for story ${storyId}`);
      // Return partial metadata or error? Returning partial for now.
    }

    // 3. Assemble Metadata Response
    // Use defaults if fields are missing from the story document
    const roomOrder = story.roomOrder || locations.map(loc => loc.id); // Default to location IDs if no order specified
    const artifacts = story.artifacts || []; // Default to empty array
    const goalRoom = story.goalRoom || roomOrder[roomOrder.length - 1] || ''; // Default to last room in order
    const requiredArtifacts = story.requiredArtifacts || []; // Default to empty array

    // Get room data and filter to ResponseRoom type
    const roomDataPromises = roomOrder.map(roomId => 
        locationsCollection.findOne({ id: roomId, storyId: storyId })
    );
    const roomResults = await Promise.all(roomDataPromises);
    const rooms: ResponseRoom[] = roomResults
        .filter((room): room is LocationRecord => room !== null)
        .map(({ _id, storyId: _storyIdIgnored, ...rest }) => rest); // Omit _id and storyId

    const metadata: StoryMetadataResponse = {
      title: story.title,
      description: story.description,
      roomOrder: roomOrder,
      artifacts: artifacts,
      goalRoom: goalRoom,
      rooms: rooms, // Use the correctly typed mapped rooms
      requiredArtifacts: requiredArtifacts,
    };

    return NextResponse.json(metadata);

  } catch (error) {
    console.error(`Error fetching metadata for story ${storyId}:`, error);
    return NextResponse.json(
      { error: `Failed to fetch metadata for story ${storyId}` }, 
      { status: 500 } 
    );
  }
} 