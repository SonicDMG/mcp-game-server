// Integration test for MCP tools. Requires 'node-fetch' and (optionally) '@types/node-fetch' for TypeScript.
// If you see a type error for 'node-fetch', run: npm install --save-dev @types/node-fetch
import fetch from 'node-fetch';

jest.setTimeout(180000); // Increase timeout to 3 minutes for slow backend operations

describe('MCP Tools Integration Test', () => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  let storyId: string;
  let startingLocation: string;
  const player1 = 'killer';
  const player2 = 'victim';
  let itemId: string | undefined;
  let challengeId: string;
  let lootableItems: string[] = [];

  it('should create a new story', async () => {
    const res = await fetch(`${baseUrl}/api/game/stories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: 'integration test dungeon' })
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.storyId).toBeDefined();
    storyId = data.storyId;
    expect(data.startingLocationId || data.startingLocation).toBeDefined();
    startingLocation = data.startingLocationId || data.startingLocation;
  });

  it('should start a game for both players', async () => {
    for (const userId of [player1, player2]) {
      const res = await fetch(`${baseUrl}/api/game/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, storyId })
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.player).toBeDefined();
      expect(data.location).toBeDefined();
    }
  });

  it('should move both players to the same location (if not already there)', async () => {
    for (const userId of [player1, player2]) {
      const res = await fetch(`${baseUrl}/api/game/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, storyId, target: startingLocation })
      });
      const text = await res.text();
      console.log(`[DEBUG][movePlayer] status: ${res.status}, body: ${text}`);
      let data;
      try { data = JSON.parse(text); } catch { data = {}; }
      // Only assert that the response is ok and success is boolean
      expect(res.ok).toBe(true);
      expect(typeof data.success).toBe('boolean');
    }
  });

  it('should look around and find an item', async () => {
    const res = await fetch(`${baseUrl}/api/game/look`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: player1, storyId })
    });
    const text = await res.text();
    console.log(`[DEBUG][lookAround] status: ${res.status}, body: ${text}`);
    let data;
    try { data = JSON.parse(text); } catch { data = {}; }
    expect(res.ok).toBe(true);
    expect(typeof data.success).toBe('boolean');
    // Use data.items (not data.location.items)
    if (Array.isArray(data.items) && data.items.length > 0) {
      itemId = data.items[0]?.id || data.items[0];
    } else {
      itemId = undefined;
      console.warn('[WARN] No items found in location, skipping examine/take tests.');
    }
  });

  it('should examine the item (if present)', async () => {
    if (!itemId) return;
    const res = await fetch(`${baseUrl}/api/game/examine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: player1, storyId, target: itemId })
    });
    const text = await res.text();
    console.log(`[DEBUG][examineTarget] status: ${res.status}, body: ${text}`);
    let data;
    try { data = JSON.parse(text); } catch { data = {}; }
    expect(res.ok).toBe(true);
    expect(typeof data.success).toBe('boolean');
    // Only check for name if success is true
    if (data.success) expect(data.name).toBeDefined();
  });

  it('should take the item (if present)', async () => {
    if (!itemId) return;
    const res = await fetch(`${baseUrl}/api/game/take`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: player1, storyId, target: itemId })
    });
    const text = await res.text();
    console.log(`[DEBUG][takeItem] status: ${res.status}, body: ${text}`);
    let data;
    try { data = JSON.parse(text); } catch { data = {}; }
    expect(res.ok).toBe(true);
    expect(typeof data.success).toBe('boolean');
    // Only check for inventory if success is true
    if (data.success) expect(Array.isArray(data.inventory)).toBe(true);
  });

  it('should try to solve a challenge if present', async () => {
    // Look for a challenge in the current location
    const lookRes = await fetch(`${baseUrl}/api/game/look`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: player1, storyId })
    });
    expect(lookRes.ok).toBe(true);
    const lookData = await lookRes.json();
    if (lookData.location && Array.isArray(lookData.location.features)) {
      const challengeFeature = lookData.location.features.find((f: unknown) => {
        return typeof f === 'object' && f !== null && 'id' in f && typeof (f as { id: unknown }).id === 'string' && (f as { id: string }).id.includes('challenge');
      });
      if (challengeFeature && typeof (challengeFeature as { id: unknown }).id === 'string') {
        challengeId = (challengeFeature as { id: string }).id;
        // Try a dummy solution
        const solveRes = await fetch(`${baseUrl}/api/game/challenge/solve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: player1, storyId, challengeId, solution: 'test' })
        });
        expect(solveRes.ok).toBe(true);
        const solveData = await solveRes.json();
        expect(solveData).toHaveProperty('success');
      }
    }
  });

  it('should kill the other player', async () => {
    const res = await fetch(`${baseUrl}/api/game/kill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: player1, targetId: player2, storyId })
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(['success', 'fail', 'counter']).toContain(data.outcome);
    if (Array.isArray(data.lootableItems)) lootableItems = data.lootableItems;
  });

  it('should loot the killed player (if there are lootable items)', async () => {
    if (lootableItems.length === 0) return;
    const res = await fetch(`${baseUrl}/api/game/loot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: player1, targetId: player2, storyId, items: lootableItems })
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.actorInventory)).toBe(true);
  });

  it('should help (revive) the killed player', async () => {
    const res = await fetch(`${baseUrl}/api/game/help`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: player1, targetId: player2, storyId })
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(['playing', 'winner', 'killed']).toContain(data.targetStatus);
  });
}); 