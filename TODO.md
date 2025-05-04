# Project TODO List

## 1. Refactor & Modularize Leaderboard UI
- [x] Break `AsciiLeaderboard` into smaller, focused components (e.g., RoomGrid, ItemCollage, StatsPanel, Modals).
- [x] Move utility functions to a separate file if needed.
- [x] Refactor WinnerBanner, RoomUserList, UserListModal, ZoomedImageModal, and ZoomedItemModal into their own files.

## 2. Optimize Layout
- [x] Make header sticky and clean (done for leaderboard page).
- [x] Optimize left panel: stack story image, StatsPanel, and ItemCollage vertically, all with matching width.
- [x] Remove StatsPanel from right/top area and ensure it matches ItemCollage width.
- [x] Ensure WinnerBanner is prominent but not cramped.

## 3. Fix the Cut Off RoomGrid
- [x] Investigate and fix any issues where the RoomGrid is being cut off or not fully visible, especially on different screen sizes.

## 4. Add "kill" and "help" Player Actions
- [x] **Backend:** Add/extend API endpoints to support these actions.
- [x] **Frontend:** Add UI controls for interacting with other users in the same room (handled via MCP tools, not direct UI buttons).
- [x] Define and implement the effects of each action (e.g., consequences, cooldowns, feedback).

## 5. Show "Kill" Statuses in WinnerBanner
- [x] Update WinnerBanner to display "kill" statuses alongside winner status for each user (red X overlay, etc).

## 6. Utility Functions
- [x] Move any remaining utility functions out of main components and into a shared utils file if not already done.

## 7. Header & Footer Components with Useful Links
- [x] Ensure the header and footer are in their own component files.
- [x] Add useful navigation or external links to both header and footer.

## 8. Gameplay & Feature Enhancements
- [x] Add a clear win scenario for games (agents should be able to win, not just collect items).
- [ ] Add random "sidequests" or events (e.g., tidalwave, creature attack) that can occur during gameplay.
- [ ] Possibly allow players to talk with each other (chat or message system).
- [ ] Fix the progress bar for number of items larger than 5 (UI bug).
- [ ] Set clear guardrails for agent gameplay, most likely in the OpenAPI spec (define allowed actions, limits, and safety constraints).

## 9. Win Path Design & Milestones

- [ ] Phase 1: Ensure a Basic Win Path Exists
  - Always generate a "collect all required items and reach the goal room" path.
  - Make this explicit in the story/game data and OpenAPI spec.
  - Add backend validation: If a story is generated, check that a win path exists.

- [ ] Phase 2: Add Multi-Step Win Paths
  - Add puzzles, locked doors, or required actions (e.g., "use key on door").
  - Update the backend and OpenAPI to support these requirements.

- [ ] Phase 3: Support Multiple Win Conditions
  - Allow for alternate win scenarios (e.g., sidequests, boss fights, escape routes).
  - Document these in the OpenAPI spec and story data.

- [ ] Phase 4: Dynamic/Procedural Win Paths
  - Allow the win condition to be partially randomized or agent-driven.
  - E.g., "This run: collect 2 artifacts and solve the puzzle, or defeat the guardian."

See assistant notes for more details and options.

- [ ] Ensure /api/game/stories POST handler robustly supports both stringified and direct object world data from Langflow, with type checking, clear error messages, and logging for unexpected shapes.

- [ ] Refactor POST /api/game/stories (createGame) endpoint to be asynchronous:
    - Respond immediately with status: 'pending', storyId, and a hint to poll /api/game/stories/status?id=... for progress.
    - Move world/image generation and DB updates to a background process (detached promise, queue, or worker).
    - Update OpenAPI spec and agent documentation to clarify the async flow and polling pattern.

- [ ] Fix item layout in zoomed-in room card

- [ ] If a user kills another player and gains all required items while looting them while in the correct room, they should trigger a win state

- [ ] Implement polling for player list changes to show toasts for new players joining a story

- [ ] Replace <img> tags with <Image /> from next/image in StoryGrid.tsx and ZoomedItemModal.tsx for better performance and to resolve Next.js warnings.

## 10. Testing Improvements
- [ ] Add integration tests that use a real or test database to verify end-to-end behavior of API handlers and business logic, ensuring correct interaction with the database and external systems. 