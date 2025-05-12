import { NextRequest, NextResponse } from 'next/server';
import { handleMoveAction } from './moveHandler';
import { checkHasMessages } from '../utils/checkHasMessages';

/**
 * POST /api/game/move
 * Moves the player to a new location if the exit and requirements are valid.
 * Required for MCP tool operation (MCP 'movePlayer' operation).
 * May also be used by the frontend for direct API calls.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await handleMoveAction(body);
    // Add hasMessages to the response
    const { userId, storyId, id } = body;
    let hasMessages = false;
    if (userId && storyId && id) {
      hasMessages = await checkHasMessages(userId, storyId, id);
    }
    return NextResponse.json({ ...result.body, hasMessages }, { status: result.status });
  } catch (error) {
    console.error('Error in move handler (Database):', error);
    let errorMessage = 'Failed to process move command due to an internal error.';
    const status = 500;
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status });
  }
}