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
- [ ] Move any remaining utility functions out of main components and into a shared utils file if not already done.

## 7. Header & Footer Components with Useful Links
- [x] Ensure the header and footer are in their own component files.
- [x] Add useful navigation or external links to both header and footer.

## 8. Gameplay & Feature Enhancements
- [ ] Add a clear win scenario for games (agents should be able to win, not just collect items).
- [ ] Add random "sidequests" or events (e.g., tidalwave, creature attack) that can occur during gameplay.
- [ ] Possibly allow players to talk with each other (chat or message system).
- [ ] Fix the progress bar for number of items larger than 5 (UI bug).
- [ ] Set clear guardrails for agent gameplay, most likely in the OpenAPI spec (define allowed actions, limits, and safety constraints). 