# MCP Game Commands Documentation

This text adventure game is designed to be played through MCP tools with AI agent assistance. The game focuses on exploration, item collection, and potentially puzzle solving within different stories.

## Core Concepts

*   **Story ID (`storyId`):** Identifies the specific adventure being played (e.g., `dragon_lair`, `mystic_library`). Required for most actions.
*   **User ID (`userId`):** Identifies the player within a specific story.
*   **Locations:** Rooms or areas within a story.
*   **Items:** Objects that can be examined, taken, or potentially used.
*   **Exits:** Connections between locations.

## Available API Endpoints

All endpoints expect a JSON request body and return a JSON response.

### `POST /api/game/start`
Starts a new game session for a user in a specific story or retrieves the existing state if the user has already started.

**Request Body:**
```json
{
  "userId": "player123",
  "storyId": "dragon_lair"
}
```

**Response Example (Success):**
```json
{
  "success": true,
  "message": "Welcome to The Dragon's Hoard (Probably)! You find yourself at the entrance...",
  "player": { /* PlayerState object */ },
  "location": { /* Location object for starting location */ }
}
```

### `POST /api/game/state`
Retrieves the current state of the game for a specific user and story.

**Request Body:**
```json
{
  "userId": "player123",
  "storyId": "dragon_lair"
}
```

**Response Example (Success):**
```json
{
  "success": true,
  "player": { /* PlayerState object */ },
  "location": { /* Location object for current location */ }
}
```

### `POST /api/game/look`
Gets details about the player's current location (description, items, exits). (This endpoint might be functionally replaced by `/api/game/state`, but kept for potential specific use cases).

**Request Body:**
```json
{
  "userId": "player123",
  "storyId": "dragon_lair"
}
```

**Response Example (Success):**
```json
{
  "success": true,
  "location": { /* Location object */ },
  "message": "You are in the Dragon Entrance...",
  "hint": "You see a Rusty Sword."
}
```

### `POST /api/game/move`
Moves the player to a connected location.

**Request Body:**
```json
{
  "userId": "player123",
  "storyId": "dragon_lair",
  "target": "guard_chamber" // ID of the location to move to
}
```

**Response Example (Success):**
```json
{
  "success": true,
  "location": { /* Location object for the new location */ },
  "message": "You move to the Guard Chamber...",
  "hint": "Remember to look around."
}
```

**Response Example (Failure - Invalid Exit):**
```json
{
  "success": false,
  "error": "You cannot move to \"treasure_hoard\" from here."
}
```

### `POST /api/game/take`
Picks up a specified item from the current location and adds it to the player's inventory.

**Request Body:**
```json
{
  "userId": "player123",
  "storyId": "dragon_lair",
  "target": "rusty_sword" // ID of the item to take
}
```

**Response Example (Success):**
```json
{
  "success": true,
  "message": "You picked up the rusty_sword.",
  "item": "rusty_sword",
  "inventory": ["rusty_sword", /* other items */ ]
}
```

**Response Example (Failure - Item Not Found):**
```json
{
    "success": false,
    "error": "Item \"shiny_rock\" not found here."
}
```

### `POST /api/game/examine`
Gets a detailed description of a specific item or feature within the current location.

**Request Body:**
```json
{
  "userId": "player123",
  "storyId": "dragon_lair",
  "target": "rusty_sword" // ID of the item/feature to examine
}
```

**Response Example (Success - Item):**
```json
{
  "success": true,
  "name": "Rusty Sword",
  "description": "A standard-issue sword, showing signs of rust and neglect.",
  "type": "item",
  "hint": "It might be useful in a fight."
}
```

**Response Example (Success - Feature):**
```json
{
  "success": true,
  "name": "Large Door",
  "description": "A heavy oak door reinforced with iron bands. It looks sturdy.",
  "type": "feature",
  "hint": "Perhaps it needs a key?"
}
```

### `GET /api/leaderboard?storyId={storyId}`
Retrieves the leaderboard data for a specific story.

**Query Parameter:**
*   `storyId`: The ID of the story (e.g., `dragon_lair`).

**Response Example (Success):**
```json
[
  {
    "id": "player123",
    "name": "player123",
    "avatarUrl": "...",
    "artifactsFound": 3,
    "puzzlesSolved": 1,
    "progress": 75
  },
  // ... other players
]
```

## Tips for AI Agents

1.  Use `start` first for a user and story.
2.  Use `state` frequently to understand the current situation (location, inventory, exits, items).
3.  Use `move` to navigate between locations via valid exits found in the state.
4.  Use `take` to pick up items found in the location details from the state.
5.  Use `examine` to get more details about specific items or features mentioned in the location description.
6.  Always include the correct `userId` and `storyId` in your requests.

## Error Handling

Endpoints generally return a `{ "success": false, "error": "Error message..." }` structure on failure, often with a relevant HTTP status code (400, 404, 500, etc.). 