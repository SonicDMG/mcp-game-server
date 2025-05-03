import db from '@/lib/astradb'; // Import DB instance
import { Story, PlayerState } from '@/app/api/game/types'; // Import types
import AppFooter from './components/AppFooter';
import AppHeader from './components/AppHeader';
import StoryGrid from './components/StoryGrid';

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
  killedCount: number;
}

// Interface for the final story data including stats
interface StoryWithStats extends StoryRecord {
  playerCount: number;
  totalArtifactsFound: number;
  killedCount: number;
}

const storiesCollection = db.collection<StoryRecord>('game_stories');
const playersCollection = db.collection<PlayerRecordForStats>('game_players');

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

        const currentStats = statsMap.get(player.storyId) || { playerCount: 0, totalArtifactsFound: 0, killedCount: 0 };
        currentStats.playerCount += 1;
        currentStats.totalArtifactsFound += player.gameProgress?.itemsFound?.length || 0;
        if (player.status === 'killed') currentStats.killedCount += 1;
        statsMap.set(player.storyId, currentStats);
      }
      console.log(`Calculated stats for ${statsMap.size} stories.`);

      // 4. Combine story data with calculated stats
      storiesWithStats = stories.map(story => {
        const stats = statsMap.get(story.id) || { playerCount: 0, totalArtifactsFound: 0, killedCount: 0 };
        return {
          ...story,
          playerCount: stats.playerCount,
          totalArtifactsFound: stats.totalArtifactsFound,
          killedCount: stats.killedCount
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
        breadcrumbs={[{ label: 'Home', href: '/' }]}
        stats={{ players: 0, artifacts: '', rooms: '', winners: 0 }}
      />
      <main className="hud-frame leaderboard-bg-gradient" style={{ width: '100vw', padding: '16px 0 32px 0' }}>
        <div className="hud-header">
          {/* Removed [Choose a Story] text */}
        </div>
        {fetchError && (
          <div style={{ color: 'red', textAlign: 'center', gridColumn: '1 / -1' }}>{fetchError}</div>
        )}
        {!fetchError && (
          <StoryGrid initialStories={storiesWithStats} />
        )}
      </main>
      <AppFooter />
    </div>
  );
}
