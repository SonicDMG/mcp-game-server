import { handleTakeAction } from './takeHandler';
import { PlayerState, Location, Story, GameItem } from '../types';

describe('handleTakeAction', () => {
  const mockInsertOne = jest.fn();
  const playersCollection = { findOne: jest.fn(), updateOne: jest.fn() };
  const locationsCollection = { findOne: jest.fn(), updateOne: jest.fn() };
  const itemsCollection = { find: jest.fn() };
  const storiesCollection = { findOne: jest.fn() };
  const services = {
    playersCollection,
    locationsCollection,
    itemsCollection,
    storiesCollection,
    eventsCollection: { insertOne: mockInsertOne },
  };
  const mockPlayer: PlayerState & { _id: string } = {
    _id: 'story1_actor',
    id: 'actor',
    storyId: 'story1',
    currentLocation: 'room1',
    inventory: [],
    discoveredLocations: [],
    gameProgress: { itemsFound: [], puzzlesSolved: [], storyProgress: 0 },
  };
  const mockLocation: Location & { _id: string } = {
    _id: 'loc1',
    id: 'room1',
    storyId: 'story1',
    name: 'Room 1',
    description: '',
    items: ['item1', 'artifact1'],
    exits: [],
  };
  const mockStory: Story & { _id: string } = {
    _id: 'story1',
    id: 'story1',
    title: '',
    description: '',
    startingLocation: '',
    version: '',
    requiredArtifacts: ['artifact1'],
  };
  const mockItem: GameItem & { _id: string } = {
    _id: 'item1',
    id: 'item1',
    storyId: 'story1',
    name: 'Sword',
    description: '',
    canTake: true,
    canUse: false,
    image: '',
  };
  const mockArtifact: GameItem & { _id: string } = {
    _id: 'artifact1',
    id: 'artifact1',
    storyId: 'story1',
    name: 'Amulet',
    description: '',
    canTake: true,
    canUse: false,
    image: '',
  };
  const mockRequest = { headers: { get: () => 'localhost' } };

  beforeEach(() => {
    jest.clearAllMocks();
    playersCollection.findOne.mockResolvedValue({ ...mockPlayer });
    playersCollection.updateOne.mockResolvedValue({});
    locationsCollection.findOne.mockResolvedValue({ ...mockLocation });
    locationsCollection.updateOne.mockResolvedValue({});
    itemsCollection.find.mockReturnValue({ toArray: async () => [mockItem, mockArtifact] });
    storiesCollection.findOne.mockResolvedValue({ ...mockStory });
  });

  it('logs a take event for item pickup', async () => {
    const input = { userId: 'actor', target: 'item1', storyId: 'story1', request: mockRequest };
    const res = await handleTakeAction(input, services);
    expect(mockInsertOne).toHaveBeenCalledWith(expect.objectContaining({
      storyId: 'story1',
      type: 'take',
      actor: 'actor',
      target: 'item1',
    }));
    expect(res.status).toBe(200);
  });

  it('logs an artifact event for required artifact pickup', async () => {
    const input = { userId: 'actor', target: 'artifact1', storyId: 'story1', request: mockRequest };
    const res = await handleTakeAction(input, services);
    expect(mockInsertOne).toHaveBeenCalledWith(expect.objectContaining({
      storyId: 'story1',
      type: 'take',
      actor: 'actor',
      target: 'artifact1',
    }));
    expect(mockInsertOne).toHaveBeenCalledWith(expect.objectContaining({
      storyId: 'story1',
      type: 'artifact',
      actor: 'actor',
      target: 'artifact1',
    }));
    expect(res.status).toBe(200);
  });
}); 