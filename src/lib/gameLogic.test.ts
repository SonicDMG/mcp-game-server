import { moveUser, takeArtifact, getUserStatus, getLeaderboard, resetGameState } from './gameLogic';

describe('gameLogic (Zork-like)', () => {
  beforeEach(() => {
    resetGameState();
  });

  it('lets a user move in cardinal directions and blocks invalid moves', () => {
    let result = moveUser('alice', 'east');
    expect(result.success).toBe(true);
    expect(getUserStatus('alice').room.id).toBe('arcade');
    result = moveUser('alice', 'north');
    expect(result.success).toBe(false); // No exit north from arcade
    expect(getUserStatus('alice').room.id).toBe('arcade');
    result = moveUser('alice', 'south');
    expect(result.success).toBe(true);
    expect(getUserStatus('alice').room.id).toBe('lobby');
  });

  it('lets a user take artifacts in rooms and blocks duplicates', () => {
    expect(takeArtifact('bob').success).toBe(true); // Neon Katana in alley
    expect(getUserStatus('bob').inventory).toContain('Neon Katana');
    expect(takeArtifact('bob').success).toBe(false); // Already taken
    moveUser('bob', 'east'); // To arcade
    expect(takeArtifact('bob').success).toBe(true); // Quantum Key
    expect(getUserStatus('bob').inventory).toContain('Quantum Key');
  });

  it('blocks entry to the goal room without all artifacts', () => {
    moveUser('eve', 'east'); // alley -> arcade
    moveUser('eve', 'south'); // arcade -> lobby
    const result = moveUser('eve', 'east'); // lobby -> vault
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/need all artifacts/i);
  });

  it('allows entry to the goal room with all artifacts', () => {
    // Collect all artifacts
    takeArtifact('carol'); // alley
    moveUser('carol', 'east'); takeArtifact('carol'); // arcade
    moveUser('carol', 'south'); takeArtifact('carol'); // lobby
    moveUser('carol', 'west'); takeArtifact('carol'); // market
    moveUser('carol', 'east'); moveUser('carol', 'east'); // lobby -> vault
    const status = getUserStatus('carol');
    expect(status.room.id).toBe('vault');
    expect(status.reachedGoal).toBe(true);
  });

  it('leaderboard shows all users and their progress', () => {
    takeArtifact('alice');
    moveUser('alice', 'east'); takeArtifact('alice');
    const leaderboard = getLeaderboard();
    expect(Array.isArray(leaderboard)).toBe(true);
    const alice = leaderboard.find(u => u.id === 'alice');
    expect(alice && alice.inventory.length).toBeGreaterThan(0);
  });

  it('leaderboard user distribution matches expected test data', () => {
    const leaderboard = getLeaderboard();
    const byRoom = (room: string) => leaderboard.filter(u => u.room === room);
    expect(byRoom('alley').length).toBe(20);
    expect(byRoom('arcade').length).toBe(5);
    expect(byRoom('market').length).toBe(3);
    expect(byRoom('lobby').length).toBe(2);
    expect(byRoom('vault').length).toBe(1);
    expect(byRoom('vault')[0].id).toBe('neo');
  });
}); 