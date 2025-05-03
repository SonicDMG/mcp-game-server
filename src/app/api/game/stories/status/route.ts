import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/astradb';

interface StoryRecord {
  _id?: string;
  id: string;
  title: string;
  description: string;
  startingLocation: string;
  version: string;
  theme?: string;
  image?: string;
  creationStatus?: 'pending' | 'done' | 'error';
  requiredArtifacts?: string[];
}

const storiesCollection = db.collection<StoryRecord>('game_stories');

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storyId = searchParams.get('id');

  if (!storyId) {
    return NextResponse.json({
      status: 'error',
      hint: 'Provide a storyId as the id query parameter.',
      message: 'Missing required storyId.'
    }, { status: 400 });
  }

  const story = await storiesCollection.findOne({ id: storyId });
  if (!story) {
    return NextResponse.json({
      status: 'error',
      hint: 'Check the storyId and try again.',
      message: `No story found with id '${storyId}'.`
    }, { status: 404 });
  }

  let hint = '';
  switch (story.creationStatus) {
    case 'pending':
      hint = 'Story is still being generated. Please poll this endpoint until status is done or error.';
      break;
    case 'done':
      hint = 'Story is ready. You can now join the game as a player.';
      break;
    case 'error':
      hint = 'Story creation failed. Please try again or contact support.';
      break;
    default:
      hint = 'Unknown status.';
  }

  return NextResponse.json({
    status: story.creationStatus || 'pending',
    hint,
    message: `Story creation status: ${story.creationStatus || 'pending'}`,
    storyId: story.id,
    title: story.title,
    description: story.description,
    imageUrl: story.image,
    startingLocation: story.startingLocation,
    requiredArtifacts: story.requiredArtifacts || [],
    version: story.version,
    theme: story.theme
  });
} 