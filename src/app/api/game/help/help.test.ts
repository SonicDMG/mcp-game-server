import { handleHelpAction } from './helpHandler';

// Mock dataService to avoid real DB import if handler tries to require it
jest.mock('../dataService', () => ({
  getPlayerState: jest.fn(),
  updatePlayerState: jest.fn(),
}));

describe('handleHelpAction', () => {
  const mockInsertOne = jest.fn();
  const mockGetPlayerState = jest.requireMock('../dataService').getPlayerState;
  const mockUpdatePlayerState = jest.requireMock('../dataService').updatePlayerState;
  const services = {
    getPlayerState: mockGetPlayerState,
    updatePlayerState: mockUpdatePlayerState,
    eventsCollection: { insertOne: mockInsertOne },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs a help event when a player revives another', async () => {
    mockGetPlayerState.mockImplementation((id: string) => {
      if (id === 'actor') return { id: 'actor', currentLocation: 'room1', storyId: 'story1', inventory: [], discoveredLocations: [], gameProgress: { itemsFound: [], puzzlesSolved: [], storyProgress: 0 } };
      if (id === 'target') return { id: 'target', currentLocation: 'room1', status: 'killed', storyId: 'story1', inventory: [], discoveredLocations: [], gameProgress: { itemsFound: [], puzzlesSolved: [], storyProgress: 0 } };
      return null;
    });
    mockUpdatePlayerState.mockResolvedValue(true);
    const input = { playerId: 'actor', targetId: 'target', storyId: 'story1' };
    const result = await handleHelpAction(input, services);
    expect(mockInsertOne).toHaveBeenCalledWith(expect.objectContaining({
      storyId: 'story1',
      type: 'help',
      actor: 'actor',
      target: 'target',
    }));
    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
  });
}); 