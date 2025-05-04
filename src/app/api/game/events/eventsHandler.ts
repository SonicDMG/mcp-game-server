import db from '@/lib/astradb';

const eventsCollection = db.collection('game_events');

export async function getEventsForStory(storyId: string, limit: number = 20) {
  const query: Record<string, unknown> = {};
  if (storyId !== 'all') {
    query.storyId = storyId;
  }
  // Add 10-minute TTL filter (ISO string)
  const tenMinutesAgoISO = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  query.timestamp = { $gte: tenMinutesAgoISO };
  // Find events (all or by story), most recent first
  const events = await eventsCollection.find(query, {
    sort: { timestamp: -1 },
    limit
  }).toArray();
  return events;
} 