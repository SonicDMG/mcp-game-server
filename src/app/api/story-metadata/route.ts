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
  goalRoomId?: string;
  requiredArtifacts?: string[];
  image?: string;
}
interface LocationRecord extends GameLocation { _id: string; }

// Collections
const storiesCollection = db.collection<StoryRecord>('game_stories');
const locationsCollection = db.collection<LocationRecord>('game_locations');
const itemsCollection = db.collection('game_items');

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
  image?: string;
  items: Array<{ id: string; name: string; description: string; image?: string }>;
}

/**
 * GET /api/story-metadata
 * Returns detailed metadata about a story, including room order, artifacts, and more.
 * Not required for MCP tool operation.
 * Used by the frontend for story/maze display, stats, or admin tools.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storyId = searchParams.get('id');

  if (!storyId) {
    return NextResponse.json({ error: 'Missing required id query parameter.' }, { status: 400 });
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

    // 2b. Fetch all items for this story
    const itemsRaw = await itemsCollection.find({ storyId: storyId }).toArray();
    const items = itemsRaw.map(({ id, name, description, image }) => ({ id, name, description, image })); // Only include required fields

    // 3. Assemble Metadata Response
    // Use defaults if fields are missing from the story document
    const roomOrder = story.roomOrder || locations.map(loc => loc.id); // Default to location IDs if no order specified
    const artifacts = story.artifacts || []; // Default to empty array
    const goalRoom = story.goalRoomId || story.goalRoom || roomOrder[roomOrder.length - 1] || ''; // Prefer goalRoomId, then goalRoom, then fallback
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
      image: story.image,
      items: items,
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
