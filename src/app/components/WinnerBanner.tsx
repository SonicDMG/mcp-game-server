import React from 'react';
import Image from 'next/image';
import { LeaderboardUser } from '../AsciiLeaderboard';

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

interface WinnerBannerProps {
  winners: LeaderboardUser[];
  onUserClick: (user: LeaderboardUser) => void;
}

const avatarUrl = (userId: string) =>
  `https://api.dicebear.com/7.x/pixel-art/png?seed=${encodeURIComponent(userId)}`;

const WinnerBanner: React.FC<WinnerBannerProps> = ({ winners, onUserClick }) => (
  <div style={{ 
    textAlign: 'center', 
    margin: '16px 0', 
    padding: '12px',
    background: 'rgba(251, 191, 36, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(251, 191, 36, 0.2)'
  }}>
    <div style={{ color: color.winner, fontWeight: 700, fontSize: '1.2rem', marginBottom: 8 }}>
      <WinnerSparkles /> WINNER{winners.length > 1 ? 'S' : ''} <WinnerSparkles />
    </div>
    {winners.map((winner, _i) => (
      <div key={winner.id + '-' + _i} style={{ 
        display: 'inline-flex', 
        alignItems: 'center',
        margin: '4px 12px',
        padding: '4px 12px',
        background: 'rgba(251, 191, 36, 0.15)',
        borderRadius: '4px'
      }}>
        <WinnerCrown />
        <Image 
          src={avatarUrl(winner.id)} 
          alt="avatar" 
          width={32} 
          height={32} 
          style={{ borderRadius: 4, marginRight: 8, background: '#222' }} 
        />
        <span style={{ 
          color: color.winner,
          fontWeight: 700,
          cursor: 'pointer',
          textDecoration: 'underline',
          textDecorationStyle: 'dotted',
          textDecorationColor: 'rgba(251, 191, 36, 0.4)',
        }}
          onClick={() => onUserClick(winner)}
        >
          {winner.id}
        </span>
        {winner.isWinner && <WinnerSparkles />}
      </div>
    ))}
  </div>
);

export default WinnerBanner; 