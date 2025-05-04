import { getEventsForStory } from './eventsHandler';

// Mock the database collection
jest.mock('@/lib/astradb', () => ({
  collection: () => ({
    find: jest.fn().mockImplementation((_query) => ({
      toArray: jest.fn().mockResolvedValue([
        // Simulate events with ISO string timestamps
        { storyId: 'test-story', timestamp: new Date().toISOString(), type: 'test', message: 'ISO event' },
        // Simulate events with number timestamps (should not be returned by ISO filter)
        { storyId: 'test-story', timestamp: Date.now(), type: 'test', message: 'Number event' },
      ]),
    })),
  }),
}));

// Define a type for the event object returned by getEventsForStory
interface TestEvent {
  storyId: string;
  timestamp: string | number;
  type: string;
  message: string;
}

describe('getEventsForStory', () => {
  it('returns events with ISO string timestamps', async () => {
    const events = await getEventsForStory('test-story', 20) as unknown as TestEvent[];
    // Should include the ISO string event
    expect(events.some((e) => typeof e.timestamp === 'string')).toBe(true);
    // Optionally, check that number timestamps are ignored (if your filter is strict)
  });
}); 