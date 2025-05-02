import React from 'react';
import Image from 'next/image';
import { LeaderboardUser } from '../AsciiLeaderboard';
import styles from './WinnerBanner.module.css';

const color = {
  winner: '#fbbf24',
  sparkle: '#fef08a',
};

const WinnerCrown = () => (
  <span style={{ color: color.winner, marginRight: 4, fontSize: '1.2em' }}>👑</span>
);

const Sparkle = ({ delay = 0 }) => (
  <span 
    style={{ 
      color: color.sparkle,
      animation: `sparkle 1s ease-in-out infinite`,
      animationDelay: `${delay}s`,
      display: 'inline-block'
    }}
  >
    ✦
  </span>
);

const WinnerSparkles = () => (
  <span style={{ marginLeft: '8px' }}>
    <Sparkle delay={0} />
    <Sparkle delay={0.2} />
    <Sparkle delay={0.4} />
  </span>
);

const avatarUrl = (userId: string) =>
  `https://api.dicebear.com/7.x/pixel-art/png?seed=${encodeURIComponent(userId)}`;

export const WinnerSection: React.FC<{
  winners: LeaderboardUser[];
  onUserClick: (user: LeaderboardUser) => void;
}> = ({ winners, onUserClick }) => (
  <div className={`${styles.section} ${styles.winnerSection}`} style={{ minWidth: 180 }}>
    <div className={styles.winnerLabel}>
      <WinnerSparkles /> WINNER{winners.length !== 1 ? 'S' : ''} <WinnerSparkles />
    </div>
    <div className={styles.userList}>
      {winners.length > 0 ? winners.map((winner, _i) => (
        <div key={winner.id + '-' + _i} className={`${styles.userCard} ${styles.winnerUserCard}`}>
          <WinnerCrown />
          <Image
            src={avatarUrl(winner.id)}
            alt="avatar"
            width={32}
            height={32}
            className={styles.avatar}
          />
          <span className={`${styles.userName} ${styles.winnerName}`} onClick={() => onUserClick(winner)}>
            {winner.id}
          </span>
          {winner.isWinner && <WinnerSparkles />}
        </div>
      )) : (
        <span className={styles.placeholder}>None</span>
      )}
    </div>
  </div>
);

export const KilledSection: React.FC<{
  killed: LeaderboardUser[];
  onUserClick: (user: LeaderboardUser) => void;
}> = ({ killed, onUserClick }) => (
  <div className={`${styles.section} ${styles.killedSection}`} style={{ minWidth: 180 }}>
    <div className={styles.killedLabel}>
      <span role="img" aria-label="skull">💀</span> KILLED
    </div>
    <div className={styles.userList}>
      {killed.length > 0 ? killed.map((user, _i) => (
        <div key={user.id + '-' + _i} className={`${styles.userCard} ${styles.killedUserCard}`}>
          <span role="img" aria-label="skull" style={{ color: '#ef4444', marginRight: 4, fontSize: '1.2em' }}>💀</span>
          <Image
            src={avatarUrl(user.id)}
            alt="avatar"
            width={32}
            height={32}
            className={`${styles.avatar} ${styles.killedAvatar}`}
          />
          <span className={`${styles.userName} ${styles.killedName}`} onClick={() => onUserClick(user)}>
            {user.id}
          </span>
        </div>
      )) : (
        <span className={styles.placeholder}>None</span>
      )}
    </div>
  </div>
);

// Keep WinnerBanner for legacy use (can be removed later)
interface WinnerBannerProps {
  winners: LeaderboardUser[];
  killed: LeaderboardUser[];
  onUserClick: (user: LeaderboardUser) => void;
}

const WinnerBanner: React.FC<WinnerBannerProps> = ({ winners, killed, onUserClick }) => (
  <div className={styles.root}>
    <WinnerSection winners={winners} onUserClick={onUserClick} />
    <div className={styles.divider} />
    <KilledSection killed={killed} onUserClick={onUserClick} />
  </div>
);

export default WinnerBanner; 