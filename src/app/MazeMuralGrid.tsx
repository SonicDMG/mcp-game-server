"use client";
import React from 'react';

const MAZE = [
  [0, 1],
  [1, 0],
];
const MURAL = [
  [null, 'red'],
  ['blue', null],
];

const CELL_SIZE = 32;

function MazeMuralGrid() {
  return (
    <div style={{ display: 'inline-block', border: '4px solid #222', background: '#111' }}>
      {MAZE.map((row, y) => (
        <div key={y} style={{ display: 'flex' }}>
          {row.map((cell, x) => {
            const color = MURAL[y][x];
            return (
              <div
                key={x}
                role="gridcell"
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  background: color || (cell === 1 ? '#444' : '#222'),
                  border: '2px solid #333',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  color: '#fff',
                }}
              >
                {/* Placeholder for user avatar or icon */}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default MazeMuralGrid; 