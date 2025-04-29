import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/astradb'; // Import the initialized Db instance

// Define interface for the story record based on observed structure
interface StoryRecord {
  _id: string; // The database ID, usually generated
  id: string; // The user-defined unique story identifier
  title: string;
  description: string;
  startingLocation: string;
  version: string;
  // Add any other expected fields
}

// Get a typed collection instance
const storiesCollection = db.collection<StoryRecord>('game_stories');

export async function POST(request: NextRequest) {
  try {
    // Expecting a complete story object, except for _id
    const storyData: Omit<StoryRecord, '_id'> = await request.json();

    console.log('POST /api/game/stories - Received data:', JSON.stringify(storyData, null, 2));

    // Validate required fields explicitly
    if (!storyData || !storyData.id || !storyData.title || !storyData.description || !storyData.startingLocation || !storyData.version) {
      console.error('POST /api/game/stories - Error: Required fields missing');
      return NextResponse.json({ error: 'Required story fields (id, title, description, startingLocation, version) are missing' }, { status: 400 });
    }
    
    // Use the collection instance directly. insertOne expects the document without _id.
    console.log('Attempting storiesCollection.insertOne()...');
    const result = await storiesCollection.insertOne(storyData);
    console.log('Document inserted successfully:', JSON.stringify(result, null, 2));
    
    // Return the insertedId provided by the database
    return NextResponse.json({ insertedId: result.insertedId });

  } catch (error) {
    console.error('Detailed error in /api/game/stories POST:', error);
    
    let status = 500;
    let errorMessage = 'Failed to create story';

    // Keep existing detailed error handling
    if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'DataAPIResponseError') {
        // Assuming DataAPIResponseError has a known structure
        interface DataAPIError extends Error {
            status?: number;
            errors?: { message: string }[];
        }
        const dataApiError = error as DataAPIError;
        console.error('DataAPI Error:', dataApiError.message);
        console.error('DataAPI Error Details:', dataApiError.errors);
        status = dataApiError.status ?? 500;
        errorMessage = `Astra DB Error: ${dataApiError.message}`;
        if (dataApiError.errors && Array.isArray(dataApiError.errors)) {
            // Safely map messages
            errorMessage += ` Details: ${dataApiError.errors.map((e) => e.message).join(', ')}`;
        }
    } else if (error instanceof Error) {
      console.error('Generic Error Stack:', error.stack);
      errorMessage = error.message;
      // Check for status properties more explicitly
      if (typeof error === 'object' && error !== null) {
        if ('status' in error && typeof error.status === 'number') {
          status = error.status;
        } else if ('response' in error && typeof error.response === 'object' && error.response !== null && 'status' in error.response && typeof error.response.status === 'number') {
          status = error.response.status;
        }
      }
      // Default to 500 if no status found
      status = status === 500 ? 500 : status; // Re-assign if not updated
    } else {
        // Handle non-Error objects
        errorMessage = String(error);
    }

    return NextResponse.json({ error: errorMessage }, { status: status });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('id');

    console.log(`GET /api/game/stories - Requested storyId: ${storyId || 'ALL'}`);
    
    // Use the collection instance directly
    if (!storyId) {
      console.log('Finding all stories (storiesCollection.find({}))...');
      // Pass an empty filter {} to find all documents
      const cursor = storiesCollection.find({});
      const stories = await cursor.toArray();
      console.log('Stories found:', stories.length);
      // Return stories including the _id
      return NextResponse.json(stories);
    } else {
      console.log(`Finding story with _id: ${storyId} (storiesCollection.findOne({ _id: storyId }))...`);
      // Use findOne with the _id filter
      const story = await storiesCollection.findOne({ _id: storyId });
      console.log('Story found:', story ? story._id : 'None');
      
      if (!story) {
        return NextResponse.json({ error: `Story with id ${storyId} not found`}, { status: 404 });
      }
       // Return the full story object including _id
      return NextResponse.json(story);
    }
  } catch (error) {
    console.error('Detailed error in /api/game/stories GET:', error);
    
    let status = 500;
    let errorMessage = 'Failed to get stories';

     // Keep existing detailed error handling
    if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'DataAPIResponseError') {
        // Reuse the interface definition or define it again if needed
        interface DataAPIError extends Error {
            status?: number;
            errors?: { message: string }[];
        }
        const dataApiError = error as DataAPIError;
        console.error('DataAPI Error:', dataApiError.message);
        console.error('DataAPI Error Details:', dataApiError.errors);
        status = dataApiError.status ?? 500;
        errorMessage = `Astra DB Error: ${dataApiError.message}`;
        if (dataApiError.errors && Array.isArray(dataApiError.errors)) {
             // Safely map messages
            errorMessage += ` Details: ${dataApiError.errors.map((e) => e.message).join(', ')}`;
        }
    } else if (error instanceof Error) {
      console.error('Generic Error Stack:', error.stack);
      errorMessage = error.message;
      // Check for status properties more explicitly
      if (typeof error === 'object' && error !== null) {
        if ('status' in error && typeof error.status === 'number') {
          status = error.status;
        } else if ('response' in error && typeof error.response === 'object' && error.response !== null && 'status' in error.response && typeof error.response.status === 'number') {
          status = error.response.status;
        }
      }
        // Default to 500 if no status found
      status = status === 500 ? 500 : status; // Re-assign if not updated
    } else {
         // Handle non-Error objects
        errorMessage = String(error);
    }

    return NextResponse.json({ error: errorMessage }, { status: status });
  }
} 