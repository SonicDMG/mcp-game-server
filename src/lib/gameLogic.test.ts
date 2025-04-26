import { moveUser, paintTile, getGameState, resetGameState } from './gameLogic';

beforeEach(() => {
  resetGameState();
});

describe('gameLogic', () => {
  it('moves a user only if the path is open', () => {
    resetGameState();
    const { users, maze } = getGameState();
    const user = users[0];
    // Try all four directions
    const directions = [
      { dx: 1, dy: 0 }, // right
      { dx: -1, dy: 0 }, // left
      { dx: 0, dy: 1 }, // down
      { dx: 0, dy: -1 }, // up
    ];
    directions.forEach(({ dx, dy }) => {
      const nx = user.x + dx;
      const ny = user.y + dy;
      const expected =
        nx >= 0 && ny >= 0 && ny < maze.length && nx < maze[0].length && maze[ny][nx] === 0;
      expect(moveUser('user1', dx, dy)).toBe(expected);
      // Move user back for next direction
      if (expected) moveUser('user1', -dx, -dy);
    });
  });

  it('paints a tile at the user position', () => {
    const { users } = getGameState();
    const user = users[0];
    paintTile('user1', 'green');
    const state = getGameState();
    expect(state.mural[user.y][user.x]).toBe('green');
  });

  it('returns the current game state', () => {
    const state = getGameState();
    expect(state).toHaveProperty('maze');
    expect(state).toHaveProperty('mural');
    expect(state).toHaveProperty('users');
  });
}); 