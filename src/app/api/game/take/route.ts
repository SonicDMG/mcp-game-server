import { NextRequest, NextResponse } from 'next/server';
import { handleTakeAction } from './takeHandler';
import { checkHasMessages, pollMessagesForUser } from '../utils/checkHasMessages';
import type { Message } from '../utils/checkHasMessages';
import logger from '@/lib/logger';

/**
 * POST /api/game/take
 * Handles taking an item from the current location and adding it to the player's inventory.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await handleTakeAction(body);
    const { userId, storyId } = result.body || {};
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
    logger.error('Error in take handler (Database):', error);
    let errorMessage = 'Failed to process take command due to an internal error.';
    const status = 500;
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status });
  }
}