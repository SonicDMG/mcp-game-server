export interface Story {
  id: string;
  title: string;
  description: string;
  startingLocation: string;
  version: string;
  requiredArtifacts?: string[];
  image?: string;
  challenges?: Challenge[];
}

export interface GameItem {
  id: string;
  storyId: string;
  name: string;
  description: string;
  canTake: boolean;
  canUse: boolean;
  useWith?: string[];
  image?: string;
}

export interface Location {
  id: string;
  storyId: string;
  name: string;
  description: string;
  items: string[];
  exits: { direction: string; targetLocationId: string; description?: string }[];
  requirements?: {
    item?: string;
    condition?: string;
  };
  image?: string;
}

export interface PlayerState {
  id: string;
  storyId: string;
  currentLocation: string;
  inventory: string[];
  discoveredLocations: string[];
  gameProgress: {
    itemsFound: string[];
    puzzlesSolved: string[];
    storyProgress: number;
  };
  status?: 'playing' | 'winner' | 'killed';
}

export interface GameResponse {
  success: boolean;
  message?: string;
  error?: string;
  hint?: string;
  location?: Location;
  items?: GameItem[];
  inventory?: GameItem[];
  effects?: string[];
}

export interface Challenge {
  id: string;
  type: 'npc' | 'creature' | 'obstacle' | 'hidden_area';
  name: string;
  description: string;
  locationId: string;
  artifactId: string;
  challengeType: 'riddle' | 'combat' | 'puzzle' | 'quest' | 'discovery' | 'ritual';
  themeTag: string;
  requirements?: { item?: string; items?: string[] };
  solvedBy?: string[];
  solution?: string;
  completionCriteria?: string;
}

export interface LangflowWorldResponse {
  startingLocationId: string;
  locations: Omit<Location, 'storyId'>[];
  items: Omit<GameItem, 'storyId'>[];
  challenges?: Challenge[];
  requiredArtifacts?: string[];
}

// Utility functions moved to src/lib/utils.ts
export { getProxiedImageUrl, getAbsoluteProxiedImageUrl } from '../../../lib/utils'; 