# MCP Game Commands Documentation

This text adventure game is designed to be played through MCP tools with AI agent assistance. The game focuses on exploration, item collection, and puzzle solving.

## Available Commands

### look
Get a description of your current location and visible items/exits.
```json
{
  "action": "look",
  "playerId": "player123"
}
```
Response example:
```json
{
  "location": "Ancient Library",
  "description": "You're in a vast library filled with dusty tomes. Moonlight filters through stained glass windows.",
  "visible_items": ["old_book", "silver_key"],
  "exits": ["hallway", "secret_passage"],
  "hint": "You can examine specific things you see for more details"
}
```

### examine [target]
Look at a specific item, location, or feature in detail.
```json
{
  "action": "examine",
  "target": "old_book",
  "playerId": "player123"
}
```
Response example:
```json
{
  "target": "old_book",
  "description": "A leather-bound tome with strange symbols on its cover. It looks important.",
  "interactions": ["take", "use"],
  "hint": "This item might be useful later"
}
```

### move [target]
Move to a new location that is currently available.
```json
{
  "action": "move",
  "target": "secret_passage",
  "playerId": "player123"
}
```
Response example:
```json
{
  "success": true,
  "new_location": "secret_passage",
  "description": "You've entered a narrow, torch-lit corridor.",
  "hint": "Remember to look around in new areas"
}
```

### take [target]
Pick up an item and add it to your inventory.
```json
{
  "action": "take",
  "target": "silver_key",
  "playerId": "player123"
}
```
Response example:
```json
{
  "success": true,
  "item": "silver_key",
  "message": "You pick up the silver key.",
  "inventory_space": "4/10"
}
```

### use [target] (with [item])
Use an item, optionally with another item.
```json
{
  "action": "use",
  "target": "silver_key",
  "with": "locked_chest",
  "playerId": "player123"
}
```
Response example:
```json
{
  "success": true,
  "message": "The key fits! The chest creaks open.",
  "effects": ["chest_opened", "key_consumed"],
  "new_items": ["ancient_scroll"]
}
```

### inventory
Check what items you're currently carrying.
```json
{
  "action": "inventory",
  "playerId": "player123"
}
```
Response example:
```json
{
  "items": [
    {
      "id": "silver_key",
      "name": "Silver Key",
      "description": "An ornate silver key with mysterious engravings"
    }
  ],
  "capacity": "1/10",
  "effects": ["none"]
}
```

## Tips for AI Agents

1. Always start with `look` when entering a new area
2. `examine` everything that seems interesting
3. Track your inventory and item usage
4. Remember locations you've visited
5. Look for patterns in item descriptions that might hint at their use

## Error Handling

All commands will return helpful error messages and hints when something goes wrong:
```json
{
  "error": "You can't move there right now",
  "hint": "Try examining your surroundings with 'look' to find valid locations",
  "status": 400
}
``` 