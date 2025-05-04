import { NextRequest, NextResponse } from 'next/server';
import { handleTakeAction } from './takeHandler';

/**
 * POST /api/game/take
 * Handles taking an item from the current location and adding it to the player's inventory.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await handleTakeAction(body);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Error in take handler (Database):', error);
    let errorMessage = 'Failed to process take command due to an internal error.';
    const status = 500;
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status });
  }
}