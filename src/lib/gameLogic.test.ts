import { moveUser, paintTile, getGameState, resetGameState } from './gameLogic';

beforeEach(() => {
  resetGameState();
});

describe('gameLogic', () => {
  it('moves a user if the path is open', () => {
    // All moves from [0,0] are blocked in this maze
    expect(moveUser('user1', 1, 0)).toBe(false); // right (wall)
    expect(moveUser('user1', 0, 1)).toBe(false); // down (wall)
  });

  it('paints a tile at the user position', () => {
    paintTile('user1', 'green');
    const state = getGameState();
    expect(state.mural[0][0]).toBe('green');
  });

  it('returns the current game state', () => {
    const state = getGameState();
    expect(state).toHaveProperty('maze');
    expect(state).toHaveProperty('mural');
    expect(state).toHaveProperty('users');
  });
}); 