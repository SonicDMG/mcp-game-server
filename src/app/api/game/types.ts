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

// Utility to proxy external images through the Next.js API (relative URL)
export function getProxiedImageUrl(src: string): string {
  if (!src) return '';
  // If src starts with /, it's local
  if (src.startsWith('/')) return src;
  // Otherwise, proxy it
  return `/api/image-proxy?url=${encodeURIComponent(src)}`;
}

/**
 * Returns an absolute proxied image URL if USE_IMAGE_PROXY is true (production),
 * otherwise returns the original src (for local dev/testing).
 * PUBLIC_HOST is only used if USE_IMAGE_PROXY is true and set.
 */
export function getAbsoluteProxiedImageUrl(request: { headers: { get: (key: string) => string | null } }, src: string): string {
  if (process.env.USE_IMAGE_PROXY === 'false') {
    return src;
  }
  const proxied = getProxiedImageUrl(src);
  if (proxied.startsWith('http')) return proxied; // Already absolute
  const publicHost = process.env.PUBLIC_HOST;
  if (publicHost) {
    return `${publicHost}${proxied}`;
  }
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  return `${protocol}://${host}${proxied}`;
} 