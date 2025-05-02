import React from 'react';
import styles from './StatsPanel.module.css';

interface StatsPanelProps {
  totalPlayers: number;
  collectedArtifacts: number;
  totalArtifacts: number;
  exploredRooms: number;
  totalRooms: number;
  winnersCount: number;
  killedCount: number;
}

const StatsPanel: React.FC<StatsPanelProps> = ({
  totalPlayers,
  collectedArtifacts,
  totalArtifacts,
  exploredRooms,
  totalRooms,
  winnersCount,
  killedCount,
}) => (
  <div className={styles.root}>
    <div><b>Players:</b> {totalPlayers}</div>
    <div><b>Artifacts:</b> {collectedArtifacts} / {totalArtifacts}</div>
    <div><b>Rooms:</b> {exploredRooms} / {totalRooms}</div>
    <div><b>Winners:</b> {winnersCount}</div>
    <div><b>Killed:</b> {killedCount}</div>
  </div>
);

export default StatsPanel; 