import Image from 'next/image';
import Link from 'next/link';
import db from '@/lib/astradb'; // Import DB instance
import { Story } from '@/app/api/game/types'; // Import Story type

// Define DB record interface
interface StoryRecord extends Story { 
  _id: string; 
  image?: string; // Optional image field
}

const storiesCollection = db.collection<StoryRecord>('game_stories');
const placeholderImage = 'https://placehold.co/320x200/23244a/3b82f6.png?text=Story+Image';

// Removed mockStories array

// Make the component async to fetch data
export default async function LandingPage() {
  let stories: StoryRecord[] = [];
  let fetchError = null;

  try {
    // Fetch all stories from the database
    console.log('Fetching stories from database...');
    const cursor = storiesCollection.find({});
    stories = await cursor.toArray();
    console.log(`Fetched ${stories.length} stories.`);
  } catch (error) {
    console.error("Failed to fetch stories:", error);
    fetchError = "Could not load stories. Please try again later.";
    // Optionally, return an error component or message here
  }

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
          {fetchError && (
            <div style={{ color: 'red', textAlign: 'center', width: '100%' }}>{fetchError}</div>
          )}
          {!fetchError && stories.length === 0 && (
            <div style={{ color: '#aaa', textAlign: 'center', width: '100%' }}>No stories available yet.</div>
          )}
          {/* Use fetched stories data */}
          {stories.map(story => (
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
                 {/* Use story.image if available, otherwise placeholder */}
                <Image src={story.image || placeholderImage} alt={story.title} width={160} height={100} style={{ borderRadius: 12, marginBottom: 16, objectFit: 'cover' }} />
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
