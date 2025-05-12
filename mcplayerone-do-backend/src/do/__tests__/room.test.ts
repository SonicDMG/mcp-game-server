import { RoomDO } from '../room';

describe('RoomDO', () => {
  it('should instantiate without error', () => {
    const state = {};
    const env = {};
    const room = new RoomDO(state, env);
    expect(room).toBeDefined();
  });
}); 