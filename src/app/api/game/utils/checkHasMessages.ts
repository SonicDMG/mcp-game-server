export async function checkHasMessages(userId: string, storyId: string, id?: string): Promise<boolean> {
  const peekRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/game/message/peek`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, storyId, id }),
  });
  const peekData = await peekRes.json();
  return Array.isArray(peekData.messages) && peekData.messages.length > 0;
}

export type Message = { userId: string; message: string; timestamp: number };

export async function pollMessagesForUser(userId: string, storyId: string, id?: string): Promise<{ messages: Message[] }> {
  const pollRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/game/message/poll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, storyId, id }),
  });
  const pollData = await pollRes.json();
  return { messages: Array.isArray(pollData.messages) ? pollData.messages : [] };
} 