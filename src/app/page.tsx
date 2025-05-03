import Image from 'next/image';
import Link from 'next/link';
import db from '@/lib/astradb'; // Import DB instance
import { Story, PlayerState, getProxiedImageUrl } from '@/app/api/game/types'; // Import types
import AppFooter from './components/AppFooter';
import AppHeader from './components/AppHeader';

// Define DB record interfaces
interface StoryRecord extends Story { 
  _id: string; 
  image?: string; // Optional image field
}

// Extend PlayerState to include necessary fields
interface PlayerRecordForStats extends PlayerState {
  _id: string;
  storyId: string; 
  gameProgress: {
    itemsFound: string[];
    puzzlesSolved: string[];
    storyProgress: number;
  };
}

// Interface for the calculated player stats per story
interface PlayerStats {
  playerCount: number;
  totalArtifactsFound: number;
}

// Interface for the final story data including stats
interface StoryWithStats extends StoryRecord {
  playerCount: number;
  totalArtifactsFound: number;
}

const storiesCollection = db.collection<StoryRecord>('game_stories');
const playersCollection = db.collection<PlayerRecordForStats>('game_players');
const placeholderImage = 'https://placehold.co/320x200/23244a/3b82f6.png?text=Story+Image';

// Removed mockStories array

// Make the component async to fetch data
export default async function LandingPage() {
  let storiesWithStats: StoryWithStats[] = [];
  let fetchError = null;

  try {
    // 1. Fetch all stories
    console.log('Fetching stories from database...');
    const stories = await storiesCollection.find({}).toArray();
    console.log(`Fetched ${stories.length} stories.`);

    if (stories.length > 0) {
      // 2. Fetch all player data (since aggregate isn't directly supported)
      console.log('Fetching all player data for stats calculation...');
      // We might want to filter fields later if performance becomes an issue
      const allPlayers = await playersCollection.find({}).toArray(); 
      console.log(`Fetched ${allPlayers.length} total players.`);

      // 3. Calculate stats in code
      const statsMap = new Map<string, PlayerStats>();

      for (const player of allPlayers) {
        if (!player.storyId) continue; // Skip players without storyId

        const currentStats = statsMap.get(player.storyId) || { playerCount: 0, totalArtifactsFound: 0 };
        currentStats.playerCount += 1;
        currentStats.totalArtifactsFound += player.gameProgress?.itemsFound?.length || 0;
        statsMap.set(player.storyId, currentStats);
      }
      console.log(`Calculated stats for ${statsMap.size} stories.`);

      // 4. Combine story data with calculated stats
      storiesWithStats = stories.map(story => {
        const stats = statsMap.get(story.id) || { playerCount: 0, totalArtifactsFound: 0 };
        return {
          ...story,
          playerCount: stats.playerCount,
          totalArtifactsFound: stats.totalArtifactsFound
        };
      });
    } else {
      storiesWithStats = [];
    }

  } catch (error) {
    console.error("Failed to fetch stories or stats:", error);
    fetchError = "Could not load story details. Please try again later.";
  }

  return (
    <div className="app-root">
      <AppHeader
        logoUrl="/images/logo.png"
        breadcrumbs={[]}
        stats={{ players: 0, artifacts: '', rooms: '', winners: 0 }}
      />
      <main className="hud-frame leaderboard-bg-gradient" style={{ width: '100vw', padding: '16px 0 32px 0' }}>
        <div className="hud-header">
          {/* Removed [Choose a Story] text */}
        </div>
        <div style={{
          width: '100%',
          maxWidth: 900,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 32,
          marginTop: 32
        }}>
          {fetchError && (
            <div style={{ color: 'red', textAlign: 'center', gridColumn: '1 / -1' }}>{fetchError}</div>
          )}
          {!fetchError && storiesWithStats.length === 0 && (
            <div style={{ color: '#aaa', textAlign: 'center', gridColumn: '1 / -1' }}>No stories available yet.</div>
          )}
          {storiesWithStats.map((story, index) => (
            <Link key={story.id} href={`/story/${story.id}`} style={{ textDecoration: 'none', display: 'flex' }}>
              <div style={{
                background: '#23244aee',
                borderRadius: 16,
                border: '2.5px solid #3b82f6',
                boxShadow: '0 4px 24px 0 #3b82f633',
                padding: 24,
                width: '100%',
                color: '#f5f6fa',
                textAlign: 'center',
                fontWeight: 600,
                fontSize: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transition: 'box-shadow 0.2s, border 0.2s',
                cursor: 'pointer',
                height: '100%'
              }}>
                <Image 
                  src={getProxiedImageUrl(story.image || placeholderImage)} 
                  alt={story.title} 
                  width={160} 
                  height={100} 
                  priority={index === 0}
                  style={{ 
                    borderRadius: 12, 
                    marginBottom: 16, 
                    objectFit: 'cover', 
                  }} 
                />
                <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>{story.title}</div>
                <div
                  style={{
                    fontSize: '1rem',
                    color: '#a78bfa',
                    marginBottom: 16,
                    flexGrow: 1,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxHeight: '2.6em', // ~2 lines
                  }}
                  title={story.description}
                >
                  {story.description.length > 100
                    ? story.description.slice(0, 100) + '…'
                    : story.description}
                </div>
                
                <div style={{
                  fontSize: '0.9rem', 
                  color: '#cbd5e1',
                  marginTop: 'auto',
                  paddingTop: 12,
                  borderTop: '1px solid #4a5568',
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-around'
                }}>
                  <span>👤 {story.playerCount}</span>
                  <span>💎 {story.totalArtifactsFound}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
