import { NextRequest, NextResponse } from 'next/server';

// POST /api/move
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, direction } = body;

  // Placeholder: In the future, update user position in the maze here

  return NextResponse.json({
    status: 'success',
    message: `User ${userId} moved ${direction}`,
  });
} 