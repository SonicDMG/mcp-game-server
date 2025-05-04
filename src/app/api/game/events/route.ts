import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/astradb';

const eventsCollection = db.collection('game_events');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    if (!storyId) {
      return NextResponse.json({ error: 'Missing storyId parameter' }, { status: 400 });
    }
    const query: Record<string, unknown> = {};
    if (storyId !== 'all') {
      query.storyId = storyId;
    }
    // Add 10-minute TTL filter
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000;
    query.timestamp = { $gte: tenMinutesAgo };
    // Find events (all or by story), most recent first
    const events = await eventsCollection.find(query, {
      sort: { timestamp: -1 },
      limit
    }).toArray();
    return NextResponse.json(events);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch events' }, { status: 500 });
  }
} 