import { handleLootAction } from './lootHandler';
import { PlayerState } from '../types';

describe('handleLootAction', () => {
  const mockInsertOne = jest.fn();
  const mockGetPlayerState = jest.fn();
  const mockUpdatePlayerState = jest.fn();
  const services = {
    getPlayerState: mockGetPlayerState,
    updatePlayerState: mockUpdatePlayerState,
    eventsCollection: { insertOne: mockInsertOne },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs a loot event when a player loots another', async () => {
    mockGetPlayerState.mockImplementation((id: string): PlayerState | null => {
      if (id === 'actor') return {
        id: 'actor',
        storyId: 'story1',
        currentLocation: 'room1',
        inventory: [],
        discoveredLocations: [],
        gameProgress: { itemsFound: [], puzzlesSolved: [], storyProgress: 0 },
        status: 'playing',
      };
      if (id === 'target') return {
        id: 'target',
        storyId: 'story1',
        currentLocation: 'room1',
        inventory: ['item1'],
        discoveredLocations: [],
        gameProgress: { itemsFound: [], puzzlesSolved: [], storyProgress: 0 },
        status: 'killed',
      };
      return null;
    });
    mockUpdatePlayerState.mockResolvedValue(true);
    const input = { playerId: 'actor', targetId: 'target', storyId: 'story1', items: ['item1'] };
    const res = await handleLootAction(input, services);
    expect(mockInsertOne).toHaveBeenCalledWith(expect.objectContaining({
      storyId: 'story1',
      type: 'loot',
      actor: 'actor',
      target: 'target',
    }));
    expect(res.status).toBe(200);
  });
}); 