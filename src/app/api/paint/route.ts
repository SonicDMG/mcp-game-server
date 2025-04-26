import { NextRequest, NextResponse } from 'next/server';

// POST /api/paint
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, x, y, color } = body;

  // Placeholder: In the future, update mural state here

  return NextResponse.json({
    status: 'success',
    message: `User ${userId} painted (${x}, ${y}) with color ${color}`,
  });
} 