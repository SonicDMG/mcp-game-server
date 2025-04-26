import { NextRequest, NextResponse } from 'next/server';
import { moveUser, getGameState } from '../../../lib/gameLogic';

// POST /api/move
export async function POST(req: NextRequest) {
  const { userId, dx, dy } = await req.json();
  const success = moveUser(userId, dx, dy);
  return NextResponse.json({
    success,
    state: getGameState(),
  });
} 