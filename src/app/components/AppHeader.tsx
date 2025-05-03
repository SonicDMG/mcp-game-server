import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { WinnerSection, KilledSection } from './WinnerBanner';
import { LeaderboardUser } from '../story/[id]/leaderboard';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface AppHeaderProps {
  logoUrl: string;
  breadcrumbs: Breadcrumb[];
  storyTag?: string;
  stats: { players: number; artifacts: string; rooms: string; winners: number; };
  winners?: LeaderboardUser[];
  killed?: LeaderboardUser[];
  onUserClick?: (user: LeaderboardUser) => void;
  eventFeed?: React.ReactNode;
}

const AppHeader: React.FC<AppHeaderProps> = (props) => {
  const { logoUrl, breadcrumbs, winners, killed, onUserClick = () => {}, eventFeed } = props;
  if (typeof window !== 'undefined') {
    // Only log on the client
    console.log('AppHeader props:', { winners, killed, eventFeed });
  }
  return (
    <header
      className="app-header"
      style={{
        position: 'relative',
        padding: '0.5rem 0',
        marginBottom: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
      }}
    >
      <div style={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', margin: '0 0 4px 0', padding: '0 32px' }}>
        <div className="breadcrumb" style={{ flex: 1, justifyContent: 'flex-start' }}>
          <a href="https://langflow.org/" target="_blank" rel="noopener noreferrer" className="footer-link">powered by <b>Langflow</b></a>
        </div>
        <div className="breadcrumb" style={{ flex: 1, justifyContent: 'flex-end', textAlign: 'right' }}>
          {breadcrumbs.map((crumb, idx) => (
            <span key={crumb.label + idx}>
              {crumb.href ? <Link href={crumb.href} className="breadcrumb-link">{crumb.label}</Link> : <span style={{ color: '#a78bfa' }}>{crumb.label}</span>}
              {idx < breadcrumbs.length - 1 && <span style={{ margin: '0 6px' }}>/</span>}
            </span>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ minWidth: 160, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flex: 1 }}>
          {typeof winners !== 'undefined' ? (
            <WinnerSection winners={winners} onUserClick={onUserClick} />
          ) : (
            <div style={{ width: 160 }} />
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <Image src={logoUrl} alt="MCP Logo" width={160} height={160} className="app-logo" style={{ objectFit: 'contain' }} />
        </div>
        <div style={{ minWidth: 160, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flex: 1 }}>
          {typeof killed !== 'undefined' ? (
            <KilledSection killed={killed} onUserClick={onUserClick} />
          ) : (
            <div style={{ width: 160 }} />
          )}
          {typeof winners === 'undefined' && typeof killed === 'undefined' && eventFeed && (
            <div style={{ marginLeft: 24 }}>{eventFeed}</div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
// Placeholder for unit test file 