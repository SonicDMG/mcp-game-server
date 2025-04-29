import { GameState } from './gameState';

describe('GameState', () => {
  const testPlayerId = 'test-player-1';

  beforeEach(() => {
    // Initialize a fresh player state before each test
    GameState.initializePlayer(testPlayerId);
  });

  describe('handleLook', () => {
    it('should return the current location description and items', () => {
      const result = GameState.handleLook(testPlayerId);
      
      expect(result.success).toBe(true);
      expect(result.location?.name).toBe('Ancient Library');
      expect(result.items).toBeDefined();
      expect(result.items?.length).toBeGreaterThan(0);
      expect(result.hint).toBeDefined();
    });
  });

  describe('handleExamine', () => {
    it('should return item details when examining a visible item', () => {
      const result = GameState.handleExamine(testPlayerId, 'silver_key');
      
      expect(result.success).toBe(true);
      expect(result.items).toBeDefined();
      expect(result.items?.[0].name).toBe('Silver Key');
      expect(result.hint).toBeDefined();
    });

    it('should return error for non-existent item', () => {
      const result = GameState.handleExamine(testPlayerId, 'nonexistent_item');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.hint).toBeDefined();
    });
  });

  describe('getPlayerState', () => {
    it('should create new player state if none exists', () => {
      const newPlayerId = 'new-player';
      const state = GameState.getPlayerState(newPlayerId);
      
      expect(state.id).toBe(newPlayerId);
      expect(state.currentLocation).toBe('library');
      expect(state.inventory).toEqual([]);
      expect(state.discoveredLocations).toContain('library');
    });

    it('should return existing player state', () => {
      const state1 = GameState.getPlayerState(testPlayerId);
      const state2 = GameState.getPlayerState(testPlayerId);
      
      expect(state1).toEqual(state2);
    });
  });
}); 