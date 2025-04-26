import { POST } from './route';
import { NextRequest } from 'next/server';

// Helper to mock NextRequest with JSON body
function mockRequest(body: any): NextRequest {
  return {
    json: async () => body,
  } as unknown as NextRequest;
}

describe('POST /api/move', () => {
  it('returns success and correct message', async () => {
    const req = mockRequest({ userId: 'user1', direction: 'north' });
    const res = await POST(req);
    const data = await res.json();
    expect(data.status).toBe('success');
    expect(data.message).toBe('User user1 moved north');
  });
}); 