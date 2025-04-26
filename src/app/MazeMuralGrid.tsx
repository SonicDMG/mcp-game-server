"use client";
import React, { useEffect, useState, useRef } from 'react';
import './globals.css';

function MazeMuralGrid() {
  const [maze, setMaze] = useState<number[][] | null>(null);
  const [mural, setMural] = useState<(string | null)[][] | null>(null);
  const [loading, setLoading] = useState(true);
  const [cellSize, setCellSize] = useState(8); // default, will be updated
  const [zoom, setZoom] = useState(1.0);
  const hudHeaderRef = useRef<HTMLDivElement>(null);

  // Responsive cell size calculation
  useEffect(() => {
    function updateCellSize() {
      const gridSize = 128;
      const padding = 64; // HUD frame padding (32px left/right)
      const headerHeight = hudHeaderRef.current?.offsetHeight || 56; // estimate if not rendered yet
      const availableWidth = window.innerWidth - padding;
      const availableHeight = window.innerHeight - (padding + headerHeight);
      const size = Math.floor(Math.min(availableWidth, availableHeight) / gridSize);
      setCellSize(size > 0 ? size : 1);
    }
    updateCellSize();
    window.addEventListener('resize', updateCellSize);
    return () => window.removeEventListener('resize', updateCellSize);
  }, []);

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

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.1, 4));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.1, 0.5));
  const effectiveCellSize = Math.round(cellSize * zoom);

  if (loading || !maze || !mural) {
    return <div style={{ color: '#fff', padding: '2rem' }}>Loading grid…</div>;
  }

  return (
    <div className="hud-frame">
      <div className="hud-dragon" aria-label="Synthwave Dragon" />
      <div className="hud-header" ref={hudHeaderRef}>
        <span className="hud-title">Maze Mosaic</span>
        <span className="hud-reserved">[HUD Area]</span>
        <div className="hud-zoom-controls">
          <button className="hud-zoom-btn" onClick={handleZoomOut} aria-label="Zoom Out">−</button>
          <span className="hud-zoom-level">{zoom.toFixed(1)}x</span>
          <button className="hud-zoom-btn" onClick={handleZoomIn} aria-label="Zoom In">+</button>
        </div>
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
                    width: effectiveCellSize,
                    height: effectiveCellSize,
                    minWidth: effectiveCellSize,
                    minHeight: effectiveCellSize,
                    maxWidth: effectiveCellSize,
                    maxHeight: effectiveCellSize,
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