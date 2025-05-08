import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/astradb';

// Room position record type
interface RoomPositionsRecord {
  _id: string; // storyId
  storyId: string;
  positions: Record<string, { x: number; y: number }>;
  rankdir?: 'LR' | 'TB';
  nodesep?: number;
  ranksep?: number;
}

const roomPositionsCollection = db.collection<RoomPositionsRecord>('game_room_positions');

// GET: /api/game/room-positions?storyId=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storyId = searchParams.get('storyId');
  if (!storyId) {
    return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });
  }
  const record = await roomPositionsCollection.findOne({ storyId });
  if (!record) {
    return NextResponse.json({ positions: null, rankdir: null, nodesep: null, ranksep: null });
  }
  return NextResponse.json({
    positions: record.positions,
    rankdir: record.rankdir ?? null,
    nodesep: record.nodesep ?? null,
    ranksep: record.ranksep ?? null,
  });
}

// POST: /api/game/room-positions
// Body: { storyId: string, positions: { [roomId]: { x, y } }, rankdir?: 'LR' | 'TB', nodesep?: number, ranksep?: number }
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { storyId, positions, rankdir, nodesep, ranksep } = body;
  if (!storyId || !positions || typeof positions !== 'object') {
    return NextResponse.json({ error: 'Missing or invalid storyId/positions' }, { status: 400 });
  }
  const _id = storyId;
  await roomPositionsCollection.updateOne(
    { _id },
    { $set: { storyId, positions, rankdir, nodesep, ranksep } },
    { upsert: true }
  );
  return NextResponse.json({ success: true });
} 