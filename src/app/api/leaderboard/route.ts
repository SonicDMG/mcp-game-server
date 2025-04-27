import { NextResponse } from 'next/server';
import { getLeaderboard } from '../../../lib/gameLogic';

// GET /api/leaderboard
export async function GET() {
  return NextResponse.json(getLeaderboard());
} 