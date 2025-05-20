export const dynamic = "force-dynamic";
import db from '@/lib/astradb'; // Import DB instance
import type { Story, PlayerState } from '@/app/api/game/types'; // Import types
import AppFooter from './components/AppFooter';
import AppHeader from './components/AppHeader';
import StoryGrid from './components/StoryGrid';
import EventFeed from './components/EventFeed';
import HeroSection from './components/HeroSection';
import mainContentStyles from './components/MainContent.module.css';

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

// Interface for the final story data including stats
interface StoryWithStats extends StoryRecord {
  playerCount: number;
  totalArtifactsFound: number;
  killedCount: number;
}

// Mark as unused since they're not directly used in this file
const _storiesCollection = db.collection<StoryRecord>('game_stories');
const _playersCollection = db.collection<PlayerRecordForStats>('game_players');

// Removed mockStories array

// Make the component async to fetch data

export default async function LandingPage() {
  let storiesWithStats: StoryWithStats[] = [];
  let fetchError = null;

  try {
    // Fetch stories from the API endpoint which already includes stats
    if (process.env.NODE_ENV !== 'production') {
      console.log('Fetching stories from API endpoint...');
    }
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/game/stories`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stories: ${response.statusText}`);
    }
    
    const stories = await response.json();
    console.log('Raw API response:', JSON.stringify(stories, null, 2));
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Fetched ${stories.length} stories from API.`);
    }
    
    // Map the API response to the expected format
    storiesWithStats = stories.map((story: StoryRecord & { playerCount?: number; totalArtifactsFound?: number; killedCount?: number }) => {
      const mapped = {
        ...story,
        _id: story.id, // Ensure _id is set for compatibility
        image: story.image || null,
        startingLocation: story.startingLocation || "",
        // Ensure all required fields are present
        playerCount: story.playerCount || 0,
        totalArtifactsFound: story.totalArtifactsFound || 0,
        killedCount: story.killedCount || 0
      };
      console.log(`Mapped story ${story.id}:`, JSON.stringify(mapped, null, 2));
      return mapped;
    });
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Mapped stories with stats:', JSON.stringify(storiesWithStats, null, 2));
    }

  } catch (error) {
    console.error("Failed to fetch stories or stats:", error);
    fetchError = "Could not load story details. Please try again later.";
  }


  return (
    <div className="relative min-h-screen">
      <AppHeader breadcrumbs={[{ label: 'Home', href: '/' }]} />
      <div>
        <main className={`hud-frame ${mainContentStyles.mainContent} landing-gradient-bg`}>
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <HeroSection />
            <EventFeed storyId="all" />
            <div id="stories">
              {fetchError ? (
                <div className="text-red-500 text-center col-span-full">
                  {fetchError}
                </div>
              ) : (
                <StoryGrid initialStories={storiesWithStats} />
              )}
            </div>
          </div>
        </main>
      </div>
      <AppFooter />
    </div>
  );
}
