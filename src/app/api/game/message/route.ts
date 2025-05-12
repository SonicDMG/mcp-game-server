import { NextRequest, NextResponse } from 'next/server';

// Placeholder: implement this to map user/story to roomId
async function getRoomIdForUser(userId: string, storyId: string): Promise<string> {
  // For now, just use storyId as roomId (customize as needed)
  return storyId;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, storyId, message, id } = body;
  const roomId = await getRoomIdForUser(userId, storyId);

  // Forward message to DO
  await fetch(`https://mcplayerone-do-backend.david-gilardi.workers.dev/room/${roomId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, message }),
  });

  // TODO: Optionally persist to DB here

  return NextResponse.json({
    jsonrpc: '2.0',
    id,
    result: { success: true }
  }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
} 