"use client";
import React, { useEffect, useState } from 'react';
import './globals.css';

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
    <div className="hud-frame">
      <div className="hud-dragon" aria-label="Synthwave Dragon" />
      <div className="hud-header">
        <span className="hud-reserved">[HUD Area]</span>
      </div>
      <div className="hud-maze-container">
        {maze.map((row, y) => (
          <div key={y} style={{ display: 'flex' }}>
            {row.map((cell, x) => {
              const color = mural[y][x];
              return (
                <div
                  key={x}
                  role="gridcell"
                  className="maze-cell"
                  style={{
                    background: color || (cell === 1 ? '#444' : '#222'),
                    border: '2px solid #333',
                  }}
                >
                  {/* Placeholder for user avatar or icon */}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MazeMuralGrid; 