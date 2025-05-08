'use client';
import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { WinnerSection, KilledSection } from './WinnerBanner';
import { LeaderboardUser } from './Leaderboard';
import styles from './AppHeader.module.css';
import StarfieldCanvas from './StarfieldCanvas';

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

const getHost = () => (typeof window !== 'undefined' ? window.location.origin : '');

function useConfigStrings() {
  return useMemo(() => {
    const host = getHost();
    const sseUrl = `${host}/api/v1/mcp/sse`;
    const openapiUrl = `${host}/api/v1/mcp/openapi`;
    const CLAUDE_CONFIG = `{
  "mcpServers": {
    "MCPlayerOne": {
      "command": "uvx",
      "args": ["mcp-proxy", "${sseUrl}"]
    }
  }
}`;
    const CURSOR_CONFIG = `{
  "MCPlayerOne": {
    "transportType": "sse",
    "url": "${sseUrl}",
    "openapi": "${openapiUrl}"
  }
}`;
    return { CLAUDE_CONFIG, CURSOR_CONFIG };
  }, []);
}

const AppHeader: React.FC<AppHeaderProps> = (props) => {
  const { logoUrl, breadcrumbs, winners, killed, onUserClick = () => {}, eventFeed } = props;
  const isLanding = breadcrumbs.length === 1 && breadcrumbs[0].label === 'Home';
  const [showClaude, setShowClaude] = useState(false);
  const [showCursor, setShowCursor] = useState(false);
  const [copiedClaude, setCopiedClaude] = useState(false);
  const [copiedCursor, setCopiedCursor] = useState(false);
  const { CLAUDE_CONFIG, CURSOR_CONFIG } = useConfigStrings();

  return (
    <header
      className={`app-header ${styles.headerContainer}`}
    >
      {/* Starfield and Sparkle backgrounds */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', width: '100%', height: 220 }}>
        <StarfieldCanvas width={1200} height={220} numStars={80} style={{ zIndex: 10000 }} />
      </div>
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
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          {isLanding ? (
            <button onClick={() => setShowClaude(true)} className={`${styles.headerButton} ${styles.claudeButton}`}>
              Claude MCP Config
            </button>
          ) : (
            typeof winners !== 'undefined' && <WinnerSection winners={winners} onUserClick={onUserClick} />
          )}
        </div>
        <div className={styles.headerCenter}>
          <Image src={logoUrl} alt="MCP Logo" width={160} height={160} className="app-logo" priority />
        </div>
        <div className={styles.headerRight}>
          {isLanding ? (
            <button onClick={() => setShowCursor(true)} className={`${styles.headerButton} ${styles.cursorButton}`}>
              Cursor MCP Config
            </button>
          ) : (
            typeof killed !== 'undefined' && <KilledSection killed={killed} onUserClick={onUserClick} />
          )}
        </div>
      </div>
      {/* Dialogs for configs */}
      {showClaude && (
        <div className={styles.headerModalOverlay} onClick={() => setShowClaude(false)}>
          <div className={styles.headerModal} onClick={e => e.stopPropagation()}>
            {/* Close (X) icon */}
            <button aria-label="Close" onClick={() => setShowClaude(false)} className={styles.headerModalClose}>
              ✕
            </button>
            <h2 className={styles.headerModalTitleClaude}>Claude MCP Config</h2>
            <div style={{ position: 'relative', width: '100%', maxWidth: '100%' }}>
              <pre className={styles.headerModalPreClaude}>{CLAUDE_CONFIG}</pre>
              <button
                aria-label="Copy config"
                onClick={() => {
                  navigator.clipboard.writeText(CLAUDE_CONFIG);
                  setCopiedClaude(true);
                  setTimeout(() => setCopiedClaude(false), 1000);
                }}
                className={styles.headerModalCopyClaude}
                title={copiedClaude ? 'Copied!' : 'Copy config'}
              >
                {copiedClaude ? (
                  // Animated checkmark SVG
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{
                    transition: 'transform 0.2s',
                    transform: copiedClaude ? 'scale(1.2)' : 'scale(1)',
                    filter: 'drop-shadow(0 0 6px #10b981cc)',
                  }}>
                    <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2" fill="none"/>
                    <path d="M8 12.5l3 3 5-5" />
                  </svg>
                ) : (
                  // Outlined clipboard SVG icon
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><rect x="4" y="6" width="16" height="16" rx="2"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {showCursor && (
        <div className={styles.headerModalOverlay} onClick={() => setShowCursor(false)}>
          <div className={styles.headerModal} onClick={e => e.stopPropagation()}>
            {/* Close (X) icon */}
            <button aria-label="Close" onClick={() => setShowCursor(false)} className={styles.headerModalClose}>
              ✕
            </button>
            <h2 className={styles.headerModalTitleCursor}>Cursor MCP Config</h2>
            <div style={{ position: 'relative', width: '100%', maxWidth: '100%' }}>
              <pre className={styles.headerModalPreCursor}>{CURSOR_CONFIG}</pre>
              <button
                aria-label="Copy config"
                onClick={() => {
                  navigator.clipboard.writeText(CURSOR_CONFIG);
                  setCopiedCursor(true);
                  setTimeout(() => setCopiedCursor(false), 1000);
                }}
                className={styles.headerModalCopyCursor}
                title={copiedCursor ? 'Copied!' : 'Copy config'}
              >
                {copiedCursor ? (
                  // Animated checkmark SVG
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{
                    transition: 'transform 0.2s',
                    transform: copiedCursor ? 'scale(1.2)' : 'scale(1)',
                    filter: 'drop-shadow(0 0 6px #10b981cc)',
                  }}>
                    <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2" fill="none"/>
                    <path d="M8 12.5l3 3 5-5" />
                  </svg>
                ) : (
                  // Outlined clipboard SVG icon
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><rect x="4" y="6" width="16" height="16" rx="2"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
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