import React from 'react';
import styles from './LeaderboardControlBar.module.css';

interface LeaderboardControlBarProps {
  rankdir: 'LR' | 'TB';
  setRankdir: (v: 'LR' | 'TB') => void;
  nodesep: number;
  setNodesep: (v: number) => void;
  ranksep: number;
  setRanksep: (v: number) => void;
  onSave: () => void;
  onReset: () => void;
  status?: string | null;
}

const LeaderboardControlBar: React.FC<LeaderboardControlBarProps> = ({
  rankdir, setRankdir, nodesep, setNodesep, ranksep, setRanksep, onSave, onReset, status
}) => (
  <div className={styles.controlBar}>
    {/* Layout direction group */}
    <div className={styles.layoutGroup}>
      <span style={{ color: '#a7a7ff', fontWeight: 500, fontSize: '0.98rem', marginRight: 2 }}>Layout:</span>
      <button
        className={rankdir === 'LR' ? `${styles.layoutButton} ${styles.layoutButtonActive}` : styles.layoutButton}
        onClick={() => setRankdir('LR')}
      >Horizontal</button>
      <button
        className={rankdir === 'TB' ? `${styles.layoutButton} ${styles.layoutButtonActive}` : styles.layoutButton}
        onClick={() => setRankdir('TB')}
      >Vertical</button>
    </div>
    {/* Status message container */}
    {status && (
      <div className={styles.statusContainer}>
        <span className={styles.statusMessage}>{status}</span>
      </div>
    )}
    {/* Spacing sliders group */}
    <div className={styles.sliderGroup}>
      <label className={styles.sliderLabel}>
        Node Spacing
        <input
          className={styles.slider}
          type="range"
          min={20}
          max={200}
          step={5}
          value={nodesep}
          onChange={e => setNodesep(Number(e.target.value))}
        />
      </label>
      <label className={styles.sliderLabel}>
        Row Spacing
        <input
          className={styles.slider}
          type="range"
          min={20}
          max={300}
          step={5}
          value={ranksep}
          onChange={e => setRanksep(Number(e.target.value))}
        />
      </label>
    </div>
    {/* Save/Reset buttons group */}
    <div className={styles.saveGroup}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          className={styles.saveButton}
          onClick={onSave}
          title="Save Layout"
        >💾</button>
        <button
          className={styles.resetButton}
          onClick={onReset}
          title="Reset Layout"
        >♻️</button>
      </div>
    </div>
  </div>
);

export default LeaderboardControlBar; 