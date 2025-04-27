import { NextRequest, NextResponse } from 'next/server';
import { takeArtifact, getUserStatus } from '../../../lib/gameLogic';

// POST /api/take
export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  const result = takeArtifact(userId);
  return NextResponse.json({
    ...result,
    status: getUserStatus(userId),
  });
} 