import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/astradb'; // Import the initialized Db instance
import { v4 as uuidv4 } from 'uuid'; // Import UUID generator
import { generateImageWithPolling } from '@/lib/everartUtils'; // Import the new utility function

// Define interface for the story record based on observed structure
interface StoryRecord {
  _id?: string; // Make _id optional for insertion consistency
  id: string;
  title: string;
  description: string;
  startingLocation: string; // Will be set by Langflow response
  version: string;
  theme?: string; // Add theme to story record for potential future use/reference
  image?: string; // Add image field from types.ts (implicitly)
}

interface LocationRecord {
    _id?: string; // Optional for insertion
    id: string; // User-defined ID (e.g., 'start', 'hallway')
    storyId: string; // Ensure storyId is present
    name: string;
    description: string;
    exits: { direction: string; targetLocationId: string; description?: string }[];
    items?: string[]; // IDs of items currently in this location
}

interface ItemRecord {
    _id?: string; // Optional for insertion
    id: string; // User-defined ID (e.g., 'key', 'gem')
    storyId: string; // Ensure storyId is present
    name: string;
    description: string;
    // flags? (e.g., takeable, usable)
}

// Interface for the expected input to the POST handler
interface CreateStoryInput {
  theme: string; // Theme is now mandatory
  id?: string;
  title?: string;
  description?: string;
  version?: string;
  // startingLocation is no longer expected as input, it comes from Langflow
}

// Interface for the expected structure of the Langflow response
interface LangflowWorldResponse {
    startingLocationId: string;
    locations: Omit<LocationRecord, 'storyId' | '_id'>[]; // From Langflow, won't have storyId yet
    items: Omit<ItemRecord, 'storyId' | '_id'>[];       // From Langflow, won't have storyId yet
}

// Interface for the outer structure of the Langflow response 
interface LangflowOuterResponse {
  outputs?: Array<{
    outputs?: Array<{
      results?: {
        message?: {
          text?: string;
          // Add other potential fields if needed, or use Record<string, any>
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: any; // Allow other properties within results
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any; // Allow other properties within inner outputs
    }>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any; // Allow other properties within outer outputs
  }>;
  // Add other potential top-level keys if needed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// Get a typed collection instance
const storiesCollection = db.collection<StoryRecord>('game_stories');
const locationsCollection = db.collection<LocationRecord>('game_locations');
const itemsCollection = db.collection<ItemRecord>('game_items');

// Define the structure for story information
export interface StoryInfo {
  storyId: string;
  name: string;
  description: string;
}

export async function POST(request: NextRequest) {
  let storyId: string | undefined = undefined; // Define storyId in outer scope for potential cleanup
  let generatedImageUrl: string | undefined = undefined;
  try {
    const inputData: CreateStoryInput = await request.json();
    console.log('POST /api/game/stories - Received data:', JSON.stringify(inputData, null, 2));

    // --- 1. Validate Input ---
    if (!inputData || !inputData.theme) {
      console.error('POST /api/game/stories - Error: Theme is missing');
      return NextResponse.json({ error: 'Required field `theme` is missing' }, { status: 400 });
    }
    const theme = inputData.theme;

    // --- 2. Generate Metadata if Missing ---
    storyId = inputData.id || uuidv4(); // Generate unique ID if not provided
    const title = inputData.title || `Story: ${theme}`;
    const description = inputData.description || `A game about ${theme}.`;
    const version = inputData.version || "1.0";

    console.log(`Resolved Story Metadata: ID=${storyId}, Title=${title}, Version=${version}`);

    // --- 3. Check for Duplicate Story ID ---
    const existingStory = await storiesCollection.findOne({ id: storyId }, { projection: { _id: 1 } });
    if (existingStory) {
        console.error(`POST /api/game/stories - Error: Story ID '${storyId}' already exists.`);
        // If the ID was provided by the user, return error. If generated, this indicates a UUID collision (highly unlikely).
        const errorMessage = inputData.id 
            ? `Story ID '${storyId}' already exists. Please provide a unique ID.`
            : `Generated Story ID '${storyId}' collision. Please try again.`;
        return NextResponse.json({ error: errorMessage }, { status: 409 }); // 409 Conflict
    }
    console.log(`Story ID '${storyId}' is unique.`);

    // --- 4. Call Langflow World Generator ---
    const langflowApiUrl = process.env.LANGFLOW_API_URL;
    const langflowEndpoint = process.env.LANGFLOW_ENDPOINT;

    if (!langflowApiUrl || !langflowEndpoint) {
        console.error('POST /api/game/stories - Error: LANGFLOW_API_URL or LANGFLOW_ENDPOINT environment variables not set.');
        throw new Error('World generation service URL components are not configured.');
    }
    
    // Construct the full URL by inserting the path segment
    const langflowUrl = `${langflowApiUrl}/api/v1/run/${langflowEndpoint}`;

    console.log(`Calling Langflow at ${langflowUrl} with theme: "${theme}"`);

    const langflowPayload = {
        "input_value": theme,
        "input_type": "chat", // Assuming these are constant for your flow
        "output_type": "chat",
        "session_id": storyId // Use the unique storyId as the session_id
    };

    console.log('Langflow Payload:', JSON.stringify(langflowPayload, null, 2)); // Log the payload

    const langflowResponse = await fetch(langflowUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(langflowPayload)
    });

    if (!langflowResponse.ok) {
        const errorBody = await langflowResponse.text();
        console.error(`POST /api/game/stories - Error from Langflow (${langflowResponse.status}): ${errorBody}`);
        throw new Error(`Failed to generate world content from Langflow service. Status: ${langflowResponse.status}`);
    }

    // Log the raw text response before attempting to parse JSON
    const rawResponseBody = await langflowResponse.text();
    console.log('POST /api/game/stories - Raw Langflow Response Body:', rawResponseBody);

    let langflowOuterResponse: LangflowOuterResponse; // Use defined interface
    try {
        // 1. Parse the outer Langflow response structure
        langflowOuterResponse = JSON.parse(rawResponseBody);
        console.log('POST /api/game/stories - Parsed Outer Langflow Response Object:', JSON.stringify(langflowOuterResponse, null, 2));
    } catch (parseError) {
        console.error('POST /api/game/stories - Error parsing outer Langflow JSON response:', parseError);
        console.error('Raw response was:', rawResponseBody); 
        throw new Error(`Failed to parse the main JSON response structure from Langflow service.`);
    }

    // 2. Extract the nested world data JSON string
    let worldDataString: string | undefined = undefined; // Explicitly allow undefined
    try {
        // Navigate the expected path, adding checks for safety
        worldDataString = langflowOuterResponse?.outputs?.[0]?.outputs?.[0]?.results?.message?.text;
        if (!worldDataString || typeof worldDataString !== 'string') {
             console.error('POST /api/game/stories - Error: Could not find world data string at expected path in Langflow response.');
             console.error('Outer Response:', JSON.stringify(langflowOuterResponse, null, 2));
             throw new Error('Langflow response structure did not contain world data string at expected path.');
        }
        console.log('POST /api/game/stories - Extracted World Data String:', worldDataString);
    } catch (accessError) {
        // Catch errors during property access (though checks should prevent most)
        console.error('POST /api/game/stories - Error accessing nested path in Langflow response:', accessError);
        console.error('Outer Response:', JSON.stringify(langflowOuterResponse, null, 2));
        throw new Error('Error processing Langflow response structure.');
    }

    // 3. Parse the extracted world data string
    let generatedWorld: LangflowWorldResponse;
    try {
        generatedWorld = JSON.parse(worldDataString);
        console.log('POST /api/game/stories - Parsed Inner World Data Object:', JSON.stringify(generatedWorld, null, 2));
    } catch (parseError) {
        console.error('POST /api/game/stories - Error parsing inner world data JSON string:', parseError);
        console.error('Extracted string was:', worldDataString);
        throw new Error(`Failed to parse the world data JSON string from Langflow response.`);
    }
    
    // --- 5. Validate Langflow Response Structure (Using the parsed inner object) ---
    if (!generatedWorld || !generatedWorld.startingLocationId || !Array.isArray(generatedWorld.locations) || !Array.isArray(generatedWorld.items) || generatedWorld.locations.length === 0) {
        console.error('POST /api/game/stories - Error: Invalid or incomplete structure in parsed world data.');
        console.error('Parsed World Data:', JSON.stringify(generatedWorld, null, 2)); // Log structure on error
        throw new Error('Parsed world data has invalid structure.');
    }
    const startingLocationId = generatedWorld.startingLocationId;
    console.log(`Parsed world data: ${generatedWorld.locations.length} locations, ${generatedWorld.items.length} items. Starting: ${startingLocationId}`);

    // --- 6. Create Story Record (Initial Insert) ---
    // Insert story WITHOUT image URL first
    const storyRecordInitial: Omit<StoryRecord, '_id' | 'image'> = {
        id: storyId,
        title: title,
        description: description,
        startingLocation: startingLocationId, 
        version: version,
        theme: theme
    };
    console.log('Attempting initial storiesCollection.insertOne() without image...');
    const storyInsertResult = await storiesCollection.insertOne(storyRecordInitial);
    console.log('Initial story document inserted successfully, DB ID:', storyInsertResult.insertedId);

    // --- 7. Prepare and Insert Locations ---
    if (typeof storyId !== 'string') {
        console.error('Critical Error: storyId is not defined before location insertion.');
        throw new Error('Internal error: Story identifier missing during data preparation.');
    }
    const currentStoryIdForLocations = storyId;
    const locationsToInsert: LocationRecord[] = generatedWorld.locations.map(loc => ({
        ...loc, 
        storyId: currentStoryIdForLocations
    }));
    console.log(`Attempting locationsCollection.insertMany() for ${locationsToInsert.length} locations...`);
    const locationInsertResult = await locationsCollection.insertMany(locationsToInsert);
    console.log(`Inserted ${locationInsertResult.insertedCount} locations.`);
    if (locationInsertResult.insertedCount !== locationsToInsert.length) {
         console.warn(`Warning: Mismatch in location insertion count. Expected ${locationsToInsert.length}, inserted ${locationInsertResult.insertedCount}`);
         // Consider adding more robust error handling or cleanup here if partial insertion is critical
    }

    // --- 8. Prepare and Insert Items ---
    if (typeof storyId !== 'string') {
        console.error('Critical Error: storyId is not defined before item insertion.');
        throw new Error('Internal error: Story identifier missing during data preparation.');
    }
    const currentStoryIdForItems = storyId;
    const itemsToInsert: ItemRecord[] = generatedWorld.items.map(item => ({
        ...item, 
        storyId: currentStoryIdForItems
    }));
    console.log(`Attempting itemsCollection.insertMany() for ${itemsToInsert.length} items...`);
    const itemInsertResult = await itemsCollection.insertMany(itemsToInsert);
    console.log(`Inserted ${itemInsertResult.insertedCount} items.`);
    if (itemInsertResult.insertedCount !== itemsToInsert.length) {
         console.warn(`Warning: Mismatch in item insertion count. Expected ${itemsToInsert.length}, inserted ${itemInsertResult.insertedCount}`);
         // Consider adding more robust error handling or cleanup here
    }

    // --- 9. Generate Image using EverArt Utils ---
    console.log('Attempting to generate story image via EverArt...');
    const imagePrompt = `A digital painting game art banner for a text adventure game titled "${title}". Theme: ${theme}. Style: fantasy art, detailed, vibrant colors.`;
    generatedImageUrl = await generateImageWithPolling(imagePrompt);

    if (generatedImageUrl) {
        console.log(`EverArt image generated: ${generatedImageUrl}. Attempting to update story record...`);
        // --- 10. Update Story Record with Image URL ---
        const updateResult = await storiesCollection.updateOne(
            { id: storyId }, // Filter by the unique story ID
            { $set: { image: generatedImageUrl } } // Set the image field
        );
        if (updateResult.modifiedCount === 1) {
            console.log(`Successfully updated story ${storyId} with image URL.`);
        } else {
            // This shouldn't happen if the initial insert succeeded, but log a warning
            console.warn(`Warning: Failed to update story ${storyId} with image URL. Update modified count: ${updateResult.modifiedCount}`);
        }
    } else {
        console.warn(`Warning: EverArt image generation failed or timed out for story ${storyId}. Story record will not have an image URL.`);
    }

    // --- 11. Return Success ---
    return NextResponse.json({
        message: 'Story created successfully using Langflow generator.' + (!generatedImageUrl ? ' Image generation failed or timed out.' : ''),
        storyId: storyId,
        title: title,
        theme: theme,
        storyDbId: storyInsertResult.insertedId,
        locationsGenerated: locationInsertResult.insertedCount,
        itemsGenerated: itemInsertResult.insertedCount,
        startingLocationId: startingLocationId,
        imageUrl: generatedImageUrl // Include the URL (or undefined) in the response
    });

  } catch (error) {
    // --- Error Handling ---
    console.error('Detailed error in /api/game/stories POST:', error);
    const status = 500; // Default status
    let errorMessage = 'Failed to create story using generation service'; 

    if (error instanceof Error) {
        errorMessage = error.message; 
    } else {
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
      // Project only necessary fields for list view
      const cursor = storiesCollection.find({}, {
        projection: {
          id: 1,
          title: 1,
          description: 1,
          version: 1,
          theme: 1 // Include theme if available
        }
      });
      const stories = await cursor.toArray();
      console.log('Stories found:', stories.length);
      // Return stories without the _id for list view
      return NextResponse.json(stories);
    } else {
      // When fetching by specific ID, get the full record
      console.log(`Finding story with id: ${storyId} (storiesCollection.findOne({ id: storyId }))...`);
      // Find by the user-defined 'id' field, not the database '_id'
      const story = await storiesCollection.findOne({ id: storyId });
      console.log('Story found:', story ? story.id : 'None');
      
      if (!story) {
        return NextResponse.json({ error: `Story with id ${storyId} not found`}, { status: 404 });
      }
       // Return the full story object
      return NextResponse.json(story);
    }
  } catch (error) {
    console.error('Detailed error in /api/game/stories GET:', error);
    
    const status = 500;
    let errorMessage = 'Failed to get stories';

     // Reuse detailed error handling from POST if applicable, or keep simpler GET error handling
    if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      errorMessage = String(error);
    }

    return NextResponse.json({ error: errorMessage }, { status: status });
  }
} 