"use client";
import React, { useEffect, useState } from 'react';

const CELL_SIZE = 32;

function MazeMuralGrid() {
  const [maze, setMaze] = useState<number[][] | null>(null);
  const [mural, setMural] = useState<(string | null)[][] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchState() {
      setLoading(true);
      const res = await fetch('/api/state');
      const data = await res.json();
      setMaze(data.maze);
      setMural(data.mural);
      setLoading(false);
    }
    fetchState();
  }, []);

  if (loading || !maze || !mural) {
    return <div style={{ color: '#fff', padding: '2rem' }}>Loading grid…</div>;
  }

  return (
    <div style={{ display: 'inline-block', border: '4px solid #222', background: '#111' }}>
      {maze.map((row, y) => (
        <div key={y} style={{ display: 'flex' }}>
          {row.map((cell, x) => {
            const color = mural[y][x];
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