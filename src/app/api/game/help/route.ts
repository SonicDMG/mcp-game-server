import { NextRequest, NextResponse } from 'next/server';
import { handleHelpAction } from './helpHandler';

/**
 * POST /api/game/help
 * Attempts to "help" (revive) another player in the same room.
 * Body: { playerId, targetId, storyId }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await handleHelpAction(body);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to process help action' }, { status: 500 });
  }
} 