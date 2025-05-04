import { getEventsForStory } from './eventsHandler';

// Mock the database collection
jest.mock('@/lib/astradb', () => ({
  collection: () => ({
    find: jest.fn().mockImplementation((query) => ({
      toArray: jest.fn().mockResolvedValue([
        // Simulate events with ISO string timestamps
        { storyId: 'test-story', timestamp: new Date().toISOString(), type: 'test', message: 'ISO event' },
        // Simulate events with number timestamps (should not be returned by ISO filter)
        { storyId: 'test-story', timestamp: Date.now(), type: 'test', message: 'Number event' },
      ]),
    })),
  }),
}));

describe('getEventsForStory', () => {
  it('returns events with ISO string timestamps', async () => {
    const events = await getEventsForStory('test-story', 20);
    // Should include the ISO string event
    expect(events.some((e: any) => typeof e.timestamp === 'string')).toBe(true);
    // Optionally, check that number timestamps are ignored (if your filter is strict)
  });
}); 