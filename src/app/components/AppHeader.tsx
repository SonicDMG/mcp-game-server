import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { WinnerSection, KilledSection } from './WinnerBanner';
import { LeaderboardUser } from './Leaderboard';
import styles from './AppHeader.module.css';

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
  return (
    <header
      className={`app-header ${styles.headerContainer}`}
    >
      {/* Breadcrumbs row at the top */}
      <div className={styles.breadcrumbsRow}>
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
      {/* Main header row with logo and banners */}
      <div className={styles.headerRow} style={{ position: 'relative', zIndex: 2 }}>
        <div className={styles.headerLeft}>
          {typeof winners !== 'undefined' && <WinnerSection winners={winners} onUserClick={onUserClick} />}
        </div>
        <div className={styles.headerCenter}>
          <Image src={logoUrl} alt="MCP Logo" width={160} height={160} className="app-logo" style={{ objectFit: 'contain' }} />
        </div>
        <div className={styles.headerRight}>
          {typeof killed !== 'undefined' && <KilledSection killed={killed} onUserClick={onUserClick} />}
        </div>
      </div>
      {/* Marquee event feed below the logo row, above the hud-frame */}
      {eventFeed && (
        <div style={{ width: '100%', margin: 0, zIndex: 1, paddingBottom: 0 }}>
          {eventFeed}
        </div>
      )}
    </header>
  );
};

export default AppHeader;
// Placeholder for unit test file 