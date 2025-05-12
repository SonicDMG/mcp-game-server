import { NextRequest, NextResponse } from 'next/server';
import { handleHelpAction } from './helpHandler';
import { checkHasMessages, pollMessagesForUser } from '../utils/checkHasMessages';
import type { Message } from '../utils/checkHasMessages';

/**
 * POST /api/game/help
 * Attempts to "help" (revive) another player in the same room.
 * Body: { playerId, targetId, storyId }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await handleHelpAction(body);
    const { userId, storyId } = body;
    let hasMessages = false;
    let messages: Message[] = [];
    if (userId && storyId) {
      hasMessages = await checkHasMessages(userId, storyId);
      if (hasMessages) {
        const pollResult = await pollMessagesForUser(userId, storyId);
        messages = pollResult.messages;
      }
    }
    return NextResponse.json({ ...result.body, hasMessages, messages }, { status: result.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to process help action' }, { status: 500 });
  }
} 