// @jest-environment node
import { POST } from './route';

// Helper to mock NextRequest with JSON body
function mockRequest(body: any): any {
  return {
    json: async () => body,
  };
}

describe('POST /api/paint', () => {
  it('returns success and correct message', async () => {
    const req = mockRequest({ userId: 'user2', x: 3, y: 4, color: 'blue' });
    const res = await POST(req);
    const data = await res.json();
    expect(data.status).toBe('success');
    expect(data.message).toBe('User user2 painted (3, 4) with color blue');
  });
}); 