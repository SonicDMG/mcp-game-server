![MCP Game Server Logo](public/images/logo.png)

# 🚀 MCP Game Server

**Turn your imagination into an AI generated game**

Welcome to the **MCP Game Server** — a synthwave, maze-crawling, world-building adventure platform! Create, explore, and compete in wild, AI-generated worlds. Powered by Next.js, [Langflow](https://langflow.org/), and your imagination.

---

## 🎮 Connect & Play via MCP Tools

You can play instantly by connecting to the public MCP Game Server using your favorite agent tools—no server setup required!

### 🖥️ Cursor (AI IDE)
1. **Install [Cursor IDE](https://www.cursor.so/)**
2. **Add the MCP Game Server as a tool server:**
   - Open Cursor and go to Extensions/Integrations.
   - Add a new MCP tool server with this config:
     ```json
     {
       "MCPlayerOne": {
         "transportType": "sse",
         "url": "https://mcplayerone.onrender.com/api/v1/mcp/sse",
         "openapi": "https://mcplayerone.onrender.com/api/v1/mcp/openapi.json"
       }
     }
     ```
3. **Start playing!** Use Cursor's chat or code tools to send MCP commands, automate moves, or analyze game data.

### 🤖 Claude (AI Chatbot/Desktop)
1. **Install Python and pip**
2. **Install [uv](https://github.com/astral-sh/uv):**
   ```bash
   pip install uv
   ```
3. **Install mcp-proxy:**
   ```bash
   uvx install mcp-proxy
   ```
4. **Add this to your Claude Desktop config:**
   ```json
   {
     "mcpServers": {
       "MCPlayerOne": {
         "command": "uvx",
         "args": ["mcp-proxy", "https://mcplayerone.onrender.com/api/v1/mcp/sse"]
       }
     }
   }
   ```
5. **Restart Claude Desktop** and select the MCPlayerOne server to start playing!

### 🛠️ Troubleshooting
- **404 or connection errors?** Make sure you're using the correct Render URL above.
- **Agent not responding?** Check that you're using the correct SSE endpoint and OpenAPI URL.
- **Session timeouts?** SSE sessions last for 1 hour of inactivity—just reconnect if needed.

---

## 🎲 Gameplay
Once you're connected, just ask for the available games or create your own. Use your imagination and let AI create a world based on your chosen theme.

### 🗝️ Available MCP Tools
These are the main MCP tools you (or your agent) can use to play. Most agents will choose actions based on your input or goals.

| Tool Name         | What It Does                                                                 |
|-------------------|------------------------------------------------------------------------------|
| **listStories**   | List all available game stories that can be played.                           |
| **createGame**    | Generate a new game story, locations, items, and cover image by theme.        |
| **startGame**     | Start a new game session for a user in a specific story, or resume if started.|
| **getGameState**  | Get the current state of the game (player and location) for a user and story. |
| **lookAround**    | Get details about the player's current location (description, items, exits).   |
| **movePlayer**    | Move the player to a new location (by target ID) if valid.                    |
| **takeItem**      | Pick up a specified item from the current location.                           |
| **examineTarget** | Get a detailed description of a specific item or feature in the current room. |
| **getLeaderboard**| Retrieve the leaderboard data for a specific story.                           |
| **getStoryById**  | Get the details of a specific story by its logical ID.                        |
| **deleteStory**   | Delete a specific story and all associated data.  (Try not to do this unless it's your story)  

---

## 🖼️ Screenshots
![App Screenshot](public/images/screenshot.png)
<p align="center"><i>Explore your world: Example gameplay</i></p>

---

## ✨ Features
- 🪐 **AI-Generated Worlds**: Instantly create new stories and mazes
- 👾 **ASCII & Pixel Art**: Retro visuals and grid-based layouts
- 🌌 **Leaderboard**: Compete for glory, see winners and the fallen
- 🚀 **Artifacts & Rooms**: Collect, explore, and interact
- 🐉 **Synthwave Theme**: Neon colors, pixel dragons, and more
- 🧑‍💻 **Powered by [Langflow](https://langflow.org/)**: Next-level AI integration

---

## 🛠️ Local Development

Want to run your own server or contribute? Follow these steps:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to play locally.

- Edit `.env` to set up API keys, endpoints, or tool access as needed.
- For Astra DB, Langflow, or other integrations, follow the comments in `.env.example`.

### MCP Tool Setup (for local dev)
- For local dev, use:
  - `http://localhost:3000/api/v1/mcp/sse` (SSE endpoint)
  - `http://localhost:3000/api/v1/mcp/openapi.json` (OpenAPI spec)
- All MCP tools are enabled by default in local dev.

---

## 🌟 Contributing
Pull requests are welcome! Open an issue, fork, and help us build the wildest worlds in the metaverse. 

- Star the repo ⭐
- Add your own ASCII art or emoji!

---

## 🔗 Links
- [GitHub](https://github.com/SonicDMG/mcp-game-server)
- [Langflow](https://langflow.org/)

---

  Thanks for visiting, explorer! 
  May your mazes be twisty and your artifacts shiny. 🟪🟦🟩🟧🟨🟫
