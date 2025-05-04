import { handleMoveAction } from './moveHandler';
import { PlayerState } from '../types';

describe('handleMoveAction', () => {
  const mockInsertOne = jest.fn();
  const playersCollection = { findOne: jest.fn(), updateOne: jest.fn() };
  const locationsCollection = { findOne: jest.fn(), updateOne: jest.fn() };
  const storiesCollection = { findOne: jest.fn() };
  const services = {
    playersCollection,
    locationsCollection,
    storiesCollection,
    eventsCollection: { insertOne: mockInsertOne },
  };
  let playerState: PlayerState & { _id: string };
  beforeEach(() => {
    jest.clearAllMocks();
    playerState = {
      _id: 'story1_actor',
      id: 'actor',
      storyId: 'story1',
      currentLocation: 'room1',
      inventory: ['artifact1'],
      discoveredLocations: [],
      gameProgress: { itemsFound: ['artifact1'], puzzlesSolved: [], storyProgress: 0 }
    };
    playersCollection.findOne.mockImplementation(() => playerState);
    playersCollection.updateOne.mockImplementation((filter, update) => {
      if (update.$set && update.$set.currentLocation) {
        playerState.currentLocation = update.$set.currentLocation;
      }
      if (update.$set && update.$set.status) {
        playerState.status = update.$set.status;
      }
      return {};
    });
    locationsCollection.findOne.mockImplementation(({ id }) => {
      if (id === 'room1') {
        return Promise.resolve({
          _id: 'loc0',
          id: 'room1',
          storyId: 'story1',
          exits: [{ targetLocationId: 'goalRoom' }]
        });
      }
      if (id === 'goalRoom') {
        return Promise.resolve({
          _id: 'loc1',
          id: 'goalRoom',
          storyId: 'story1',
          exits: []
        });
      }
      return Promise.resolve(null);
    });
    storiesCollection.findOne.mockResolvedValue({ _id: 'story1', id: 'story1', goalRoomId: 'goalRoom', requiredArtifacts: ['artifact1'] });
  });

  it('logs a win event when a player wins the game', async () => {
    const input = { userId: 'actor', target: 'goalRoom', storyId: 'story1' };
    const res = await handleMoveAction(input, services);
    expect(mockInsertOne).toHaveBeenCalledWith(expect.objectContaining({
      storyId: 'story1',
      type: 'win',
      actor: 'actor',
    }));
    expect(res.status).toBe(200);
    expect(res.body.win).toBe(true);
  });
}); 