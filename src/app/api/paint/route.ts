import { NextRequest, NextResponse } from 'next/server';
import { paintTile, getGameState } from '../../../lib/gameLogic';

// POST /api/paint
export async function POST(req: NextRequest) {
  const { userId, color } = await req.json();
  const success = paintTile(userId, color);
  return NextResponse.json({
    success,
    state: getGameState(),
  });
} 