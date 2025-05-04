import { NextRequest, NextResponse } from 'next/server';
import { getEventsForStory } from './eventsHandler';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    if (!storyId) {
      return NextResponse.json({ error: 'Missing storyId parameter' }, { status: 400 });
    }
    const events = await getEventsForStory(storyId, limit);
    return NextResponse.json(events);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch events' }, { status: 500 });
  }
} 