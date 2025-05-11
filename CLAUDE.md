# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The MCP Game Server is a synthwave-themed, maze-crawling, world-building adventure platform that allows users to create and participate in AI-generated games. The project is built with Next.js and leverages [Langflow](https://langflow.org/) for AI integration. Players can connect via MCP tools in Cursor IDE or Claude Desktop.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linter
npm run lint

# Run tests
npm test

# Run a specific test file
npx jest path/to/test-file.test.ts

# Run tests with watch mode
npx jest --watch
```

## Architecture

The MCP Game Server is a Next.js application with the following key components:

1. **API Layer**: RESTful endpoints for game interactions
   - `/api/game/*`: Game-specific endpoints for player actions
   - `/api/v1/mcp/*`: MCP integration endpoints for external tools

2. **Game Logic Components**:
   - Story generation and management
   - Player state tracking
   - Game world interactions (move, look, take, examine, etc.)
   - Challenge/puzzle system

3. **UI Components**:
   - Leaderboard and game statistics
   - Room visualization (grid system)
   - Item collection display
   - User interaction interfaces

4. **External Integrations**:
   - Langflow for AI-generated content
   - AstraDB for data persistence
   - MCP protocol support for agent integration

## Key Concepts

1. **Stories**: AI-generated game worlds with unique themes
2. **Locations/Rooms**: Areas within stories that players can navigate
3. **Items/Artifacts**: Objects players can collect, some required to win
4. **Players**: Users interacting with the game world
5. **Challenges**: Puzzles or tasks that gate progress or item acquisition

## Game Flow

1. Create or select a story (game world)
2. Start a game session with a unique user ID
3. Navigate through rooms, collect items, and solve challenges
4. Complete win conditions (collect required artifacts and reach goal room)

## Testing Guidelines

- API tests should use `@jest-environment node` annotation
- UI tests use the default jsdom environment
- Mock external services like Langflow and AstraDB
- Integration tests should validate game flow and state management

## Error Handling

The API uses standardized error responses:
- HTTP status codes for transport-level issues
- JSON-RPC error codes for MCP/SSE communication
- Game logic errors use `{ success: false, error: "message" }` format

## MCP Tools Integration

For local development:
- SSE endpoint: `http://localhost:3000/api/v1/mcp/sse`
- OpenAPI spec: `http://localhost:3000/api/v1/mcp/openapi.json`

## Production Environment

The production server is hosted on Render with endpoints:
- SSE endpoint: `https://mcplayerone.onrender.com/api/v1/mcp/sse`
- OpenAPI spec: `https://mcplayerone.onrender.com/api/v1/mcp/openapi.json`