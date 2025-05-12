import { NextRequest, NextResponse } from 'next/server';
import { handleLootAction } from './lootHandler';
import { checkHasMessages, pollMessagesForUser } from '../utils/checkHasMessages';
import type { Message } from '../utils/checkHasMessages';

/**
 * POST /api/game/loot
 * Allows a player to loot items from a killed player in the same room.
 * Body: { playerId, targetId, storyId, items: [itemId, ...] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await handleLootAction(body);
    const { playerId, storyId } = body;
    let hasMessages = false;
    let messages: Message[] = [];
    if (playerId && storyId) {
      hasMessages = await checkHasMessages(playerId, storyId);
      if (hasMessages) {
        const pollResult = await pollMessagesForUser(playerId, storyId);
        messages = pollResult.messages;
      }
    }
    return NextResponse.json({ ...result.body, hasMessages, messages }, { status: result.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to process loot action' }, { status: 500 });
  }
} 