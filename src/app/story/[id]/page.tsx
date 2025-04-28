import LeaderboardHUD from '../../MazeMuralGrid';
import Image from 'next/image';
import Link from 'next/link';

export default function StoryLeaderboardPage() {
  return (
    <div className="app-root">
      <header className="app-header">
        <div className="breadcrumb">
          <Link href="/" className="breadcrumb-link">
            Home
          </Link>
          <span>/</span>
          <span style={{ color: '#a78bfa' }}>Story</span>
        </div>
        <Image
          src="/images/logo.png"
          alt="App Logo"
          width={160}
          height={160}
          className="app-logo"
          priority
        />
      </header>
      <main className="hud-frame leaderboard-bg-gradient" style={{ width: '100vw', minWidth: 0, padding: '16px 0 32px 0' }}>
        <LeaderboardHUD />
      </main>
      <footer className="app-footer">
        <span>© {new Date().getFullYear()} Maze Adventure</span>
      </footer>
    </div>
  );
} 