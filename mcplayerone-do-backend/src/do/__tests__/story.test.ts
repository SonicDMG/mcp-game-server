// Test for StoryDO (was RoomDO)
import { StoryDO } from '../story';
// @ts-ignore
import { describe, it, expect } from '@jest/globals';

describe('StoryDO', () => {
  it('should instantiate', () => {
    const state = {};
    const env = {};
    const story = new StoryDO(state, env);
    expect(story).toBeDefined();
  });
}); 