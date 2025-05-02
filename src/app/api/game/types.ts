export interface Story {
  id: string;
  title: string;
  description: string;
  startingLocation: string;
  version: string;
  requiredArtifacts?: string[];
  image?: string;
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
  status?: 'playing' | 'winner';
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