// @jest-environment node
import { GET } from './route';

describe('GET /api/state', () => {
  it('returns placeholder game state', async () => {
    const req = {} as any;
    const res = await GET(req);
    const data = await res.json();
    expect(data).toHaveProperty('maze');
    expect(data).toHaveProperty('mural');
    expect(data).toHaveProperty('users');
    expect(Array.isArray(data.users)).toBe(true);
  });
}); 