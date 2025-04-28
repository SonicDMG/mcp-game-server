import Image from 'next/image';
import Link from 'next/link';

const placeholderImage = 'https://placehold.co/320x200/23244a/3b82f6.png?text=Story+Image';

const mockStories = [
  {
    id: 'cyberpunk-maze',
    title: 'Cyberpunk Maze Adventure',
    description: 'Navigate the neon-lit maze, collect artifacts, and reach the vault!',
    image: placeholderImage,
  },
];

export default function LandingPage() {
  return (
    <div className="app-root">
      <header className="app-header">
        <Image src="/images/logo.png" alt="App Logo" width={56} height={56} className="app-logo" />
      </header>
      <main className="hud-frame leaderboard-bg-gradient" style={{ width: '100vw', minWidth: 0, padding: '16px 0 32px 0' }}>
        <div className="hud-header">
          <span className="hud-reserved">[Choose a Story]</span>
        </div>
        <div style={{ width: '100%', maxWidth: 900, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 32, justifyContent: 'center', marginTop: 32 }}>
          {mockStories.map(story => (
            <Link key={story.id} href={`/story/${story.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#23244aee',
                borderRadius: 16,
                border: '2.5px solid #3b82f6',
                boxShadow: '0 4px 24px 0 #3b82f633',
                padding: 24,
                minWidth: 220,
                maxWidth: 260,
                color: '#f5f6fa',
                textAlign: 'center',
                fontWeight: 600,
                fontSize: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transition: 'box-shadow 0.2s, border 0.2s',
                cursor: 'pointer',
              }}>
                <Image src={story.image} alt={story.title} width={160} height={100} style={{ borderRadius: 12, marginBottom: 16, objectFit: 'cover' }} />
                <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>{story.title}</div>
                <div style={{ fontSize: '1rem', color: '#a78bfa', marginBottom: 8 }}>{story.description}</div>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <footer className="app-footer">
        <span>© {new Date().getFullYear()} Maze Adventure</span>
      </footer>
    </div>
  );
}
