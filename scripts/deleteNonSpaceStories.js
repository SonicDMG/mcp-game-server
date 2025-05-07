import fetch from "node-fetch";

const API_BASE = 'http://localhost:3000/api/game/stories';
const SPACE_ADVENTURE_ID = '878e1472-4788-4944-98dd-98d6873a771b';

(async () => {
  try {
    // 1. Get all stories
    const res = await fetch(API_BASE);
    const stories = await res.json();

    // 2. Filter out the space adventure
    const toDelete = stories.filter(story => story.id !== SPACE_ADVENTURE_ID);

    // 3. Delete each story
    let deletedCount = 0;
    for (const story of toDelete) {
      const delRes = await fetch(`${API_BASE}/${story.id}`, { method: 'DELETE' });
      if (delRes.ok) {
        console.log(`Deleted story: ${story.title} (${story.id})`);
        deletedCount++;
      } else {
        console.error(`Failed to delete story: ${story.title} (${story.id})`);
      }
    }
    console.log(`Deleted ${deletedCount} stories (all except the original space adventure).`);
    process.exit(0);
  } catch (err) {
    console.error('Error deleting stories:', err);
    process.exit(1);
  }
})(); 