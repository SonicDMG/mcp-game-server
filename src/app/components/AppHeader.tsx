import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { WinnerSection, KilledSection } from './WinnerBanner';
import { LeaderboardUser } from '../AsciiLeaderboard';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface AppHeaderProps {
  logoUrl: string;
  breadcrumbs: Breadcrumb[];
  storyTitle: string;
  storyTag?: string;
  stats: { players: number; artifacts: string; rooms: string; winners: number; };
  winners?: LeaderboardUser[];
  killed?: LeaderboardUser[];
  onUserClick?: (user: LeaderboardUser) => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ logoUrl, breadcrumbs, storyTitle, winners = [], killed = [], onUserClick = () => {} }) => (
  <header
    className="app-header"
    style={{
      position: 'sticky',
      top: 0,
      zIndex: 200,
      background: 'rgba(18, 22, 40, 0.98)',
      boxShadow: '0 2px 16px #000a',
      padding: '0.5rem 0',
      marginBottom: 24,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
    }}
  >
    <div className="breadcrumb" style={{ alignSelf: 'flex-start', marginLeft: 32, marginBottom: 4 }}>
      {breadcrumbs.map((crumb, idx) => (
        <span key={crumb.label + idx}>
          {crumb.href ? <Link href={crumb.href} className="breadcrumb-link">{crumb.label}</Link> : <span style={{ color: '#a78bfa' }}>{crumb.label}</span>}
          {idx < breadcrumbs.length - 1 && <span style={{ margin: '0 6px' }}>/</span>}
        </span>
      ))}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, width: '100%', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <WinnerSection winners={winners} onUserClick={onUserClick} />
      </div>
      <Image src={logoUrl} alt="MCP Logo" width={120} height={48} style={{ objectFit: 'contain' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <KilledSection killed={killed} onUserClick={onUserClick} />
      </div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ color: '#3b82f6', fontWeight: 700, fontSize: '1.5rem', letterSpacing: 1 }}>{storyTitle}</div>
      </div>
    </div>
  </header>
);

export default AppHeader;
// Placeholder for unit test file 