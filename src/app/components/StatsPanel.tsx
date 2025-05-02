import React from 'react';

interface StatsPanelProps {
  totalPlayers: number;
  collectedArtifacts: number;
  totalArtifacts: number;
  exploredRooms: number;
  totalRooms: number;
  winnersCount: number;
}

const StatsPanel: React.FC<StatsPanelProps> = ({
  totalPlayers,
  collectedArtifacts,
  totalArtifacts,
  exploredRooms,
  totalRooms,
  winnersCount,
}) => (
  <div style={{
    background: '#23244a',
    borderRadius: 10,
    padding: '12px 16px',
    color: '#fff',
    fontSize: 14,
    boxShadow: '0 2px 12px #0006',
    width: '100%',
    marginBottom: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  }}>
    <div><b>Players:</b> {totalPlayers}</div>
    <div><b>Artifacts:</b> {collectedArtifacts} / {totalArtifacts}</div>
    <div><b>Rooms:</b> {exploredRooms} / {totalRooms}</div>
    <div><b>Winners:</b> {winnersCount}</div>
  </div>
);

export default StatsPanel; 