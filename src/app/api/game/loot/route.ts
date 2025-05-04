import { NextRequest, NextResponse } from 'next/server';
import { handleLootAction } from './lootHandler';

/**
 * POST /api/game/loot
 * Allows a player to loot items from a killed player in the same room.
 * Body: { playerId, targetId, storyId, items: [itemId, ...] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await handleLootAction(body);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to process loot action' }, { status: 500 });
  }
} 