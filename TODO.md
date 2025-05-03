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

## 5. Add "kill" and "help" Player Actions
- [ ] **Backend:** Add/extend API endpoints to support these actions.
- [ ] **Frontend:** Add UI controls for interacting with other users in the same room.
- [ ] Define and implement the effects of each action (e.g., consequences, cooldowns, feedback).

## 6. Show "Kill" Statuses in WinnerBanner
- [ ] Update WinnerBanner to display "kill" statuses alongside winner status for each user.

## 7. Utility Functions
- [ ] Move any remaining utility functions out of main components and into a shared utils file if not already done.

## 8. Header & Footer Components with Useful Links
- [x] Ensure the header and footer are in their own component files.
- [x] Add useful navigation or external links to both header and footer. 