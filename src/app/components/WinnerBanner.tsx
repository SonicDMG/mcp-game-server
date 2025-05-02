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
  killed: LeaderboardUser[];
  onUserClick: (user: LeaderboardUser) => void;
}

const avatarUrl = (userId: string) =>
  `https://api.dicebear.com/7.x/pixel-art/png?seed=${encodeURIComponent(userId)}`;

const WinnerBanner: React.FC<WinnerBannerProps> = ({ winners, killed, onUserClick }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: 0,
    margin: '16px 0',
    padding: '0',
    background: 'rgba(251, 191, 36, 0.08)',
    borderRadius: '10px',
    border: '1.5px solid rgba(251, 191, 36, 0.18)',
    boxShadow: '0 2px 16px #fbbf2433',
    maxWidth: 900,
    marginLeft: 'auto',
    marginRight: 'auto',
    overflow: 'hidden',
  }}>
    {/* Winners Section */}
    <div style={{
      flex: 1,
      padding: '18px 12px 12px 12px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(251, 191, 36, 0.08)',
    }}>
      <div style={{ color: color.winner, fontWeight: 700, fontSize: '1.2rem', marginBottom: 8 }}>
        <WinnerSparkles /> WINNER{winners.length !== 1 ? 'S' : ''} <WinnerSparkles />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 0 }}>
        {winners.length > 0 ? winners.map((winner, _i) => (
          <div key={winner.id + '-' + _i} style={{
            display: 'inline-flex',
            alignItems: 'center',
            margin: '4px 8px',
            padding: '4px 12px',
            background: 'rgba(251, 191, 36, 0.15)',
            borderRadius: '4px',
            border: '2px solid #fbbf24',
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
        )) : (
          <span style={{ color: '#b3b3b3', fontStyle: 'italic', opacity: 0.7 }}>None</span>
        )}
      </div>
    </div>
    {/* Vertical Divider */}
    <div style={{
      width: 1,
      background: 'linear-gradient(to bottom, #fbbf24 0%, #ef4444 100%)',
      margin: '0 0',
      opacity: 0.5,
      minHeight: 64,
      alignSelf: 'center',
    }} />
    {/* Killed Section */}
    <div style={{
      flex: 1,
      padding: '18px 12px 12px 12px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(239, 68, 68, 0.06)',
    }}>
      <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '1.1rem', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <span role="img" aria-label="skull">💀</span> KILLED
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8 }}>
        {killed.length > 0 ? killed.map((user, _i) => (
          <div key={user.id + '-' + _i} style={{
            display: 'inline-flex',
            alignItems: 'center',
            margin: '4px 8px',
            padding: '4px 12px',
            background: 'rgba(239, 68, 68, 0.13)',
            borderRadius: '4px',
            border: '2px solid #ef4444',
          }}>
            <span role="img" aria-label="skull" style={{ color: '#ef4444', marginRight: 4, fontSize: '1.2em' }}>💀</span>
            <Image
              src={avatarUrl(user.id)}
              alt="avatar"
              width={32}
              height={32}
              style={{ borderRadius: 4, marginRight: 8, background: '#222', border: '2px solid #ef4444' }}
            />
            <span style={{
              color: '#ef4444',
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
              textDecorationColor: 'rgba(239, 68, 68, 0.4)',
            }}
              onClick={() => onUserClick(user)}
            >
              {user.id}
            </span>
          </div>
        )) : (
          <span style={{ color: '#b3b3b3', fontStyle: 'italic', opacity: 0.7 }}>None</span>
        )}
      </div>
    </div>
  </div>
);

export default WinnerBanner; 