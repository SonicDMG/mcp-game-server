import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/astradb';
import type { Challenge, GameItem } from '../../types';

/**
 * POST /api/game/challenge/solve
 * Body: { userId, storyId, challengeId, solution }
 * Handles submitting a solution to a challenge (e.g., riddle, puzzle, quest).
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, storyId, challengeId, solution } = await request.json();
    if (!userId || !storyId || !challengeId || !solution) {
      return NextResponse.json({
        success: false,
        error: 'userId, storyId, challengeId, and solution are required',
      }, { status: 400 });
    }
    // Fetch player, story, and challenge
    const playerDocId = `${storyId}_${userId}`;
    const playersCollection = db.collection('game_players');
    const storiesCollection = db.collection('game_stories');
    const itemsCollection = db.collection('game_items');
    const player = await playersCollection.findOne({ _id: playerDocId });
    if (!player) {
      return NextResponse.json({ success: false, needsPlayer: true, error: 'Player not found. Please start the game first.', hint: 'Call /api/game/start to create a new player.' }, { status: 200 });
    }
    const story = await storiesCollection.findOne({ id: storyId });
    if (!story || !Array.isArray(story.challenges)) {
      return NextResponse.json({ success: false, error: 'Story or challenges not found.' }, { status: 404 });
    }
    const challenge: Challenge | undefined = story.challenges.find((c: Challenge) => c.id === challengeId);
    if (!challenge) {
      return NextResponse.json({ success: false, error: 'Challenge not found.' }, { status: 404 });
    }
    // Check player is at the correct location
    if (player.currentLocation !== challenge.locationId) {
      return NextResponse.json({
        success: false,
        error: `You must be at ${challenge.locationId} to solve this challenge.`
      }, { status: 400 });
    }
    // Check requirements (e.g., required item)
    if (challenge.requirements && challenge.requirements.item) {
      if (!player.inventory.includes(challenge.requirements.item)) {
        return NextResponse.json({
          success: false,
          error: `You need the item: ${challenge.requirements.item} to attempt this challenge.`
        }, { status: 400 });
      }
    }
    // TODO: Add more requirement checks as needed
    // Compare solution (case-insensitive, trimmed)
    let isCorrect = false;
    if (challenge.solution) {
      isCorrect = solution.trim().toLowerCase() === challenge.solution.trim().toLowerCase();
    } else if (challenge.expectedAction) {
      // For discovery/action challenges, require the correct action/command
      if (
        solution.trim().toLowerCase() === challenge.expectedAction.trim().toLowerCase() &&
        (!challenge.requirements?.item || player.inventory.includes(challenge.requirements.item)) &&
        player.currentLocation === challenge.locationId
      ) {
        isCorrect = true;
      } else {
        return NextResponse.json({
          success: false,
          error: 'You must perform the correct action in the right location with the required item to complete this challenge.'
        }, { status: 400 });
      }
    } else if (challenge.completionCriteria) {
      // Special logic for other non-text challenges
      if (
        (!challenge.requirements?.item || player.inventory.includes(challenge.requirements.item)) &&
        player.currentLocation === challenge.locationId
      ) {
        isCorrect = true;
      } else {
        return NextResponse.json({
          success: false,
          error: 'You must be in the correct location and have the required item to complete this challenge.'
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'No solution defined for this challenge.'
      }, { status: 400 });
    }
    if (!isCorrect) {
      return NextResponse.json({
        success: false,
        error: 'Incorrect solution. Try again!'
      }, { status: 200 });
    }
    // Award artifact if not already in inventory
    if (challenge.artifactId) {
      if (!player.inventory.includes(challenge.artifactId)) {
        player.inventory.push(challenge.artifactId);
        await playersCollection.updateOne({ _id: player._id }, { $set: { inventory: player.inventory } });
      }
    }
    // Update progress (e.g., mark challenge as solved)
    player.gameProgress = player.gameProgress || {};
    player.gameProgress.puzzlesSolved = player.gameProgress.puzzlesSolved || [];
    if (!player.gameProgress.puzzlesSolved.includes(challengeId)) {
      player.gameProgress.puzzlesSolved.push(challengeId);
      await playersCollection.updateOne(
        { _id: player._id },
        { $set: { 'gameProgress.puzzlesSolved': player.gameProgress.puzzlesSolved } }
      );
    }
    // Optionally, log event or return awarded item details
    let artifact: GameItem | null = null;
    if (challenge.artifactId) {
      artifact = await itemsCollection.findOne({ id: challenge.artifactId, storyId });
    }

    // --- WIN CONDITION CHECK (added) ---
    if (story && story.goalRoomId && story.requiredArtifacts) {
      const inGoalRoom = player.currentLocation === story.goalRoomId;
      const hasAllArtifacts = story.requiredArtifacts.every((artifactId: string) => player.inventory.includes(artifactId));
      if (inGoalRoom && hasAllArtifacts) {
        await playersCollection.updateOne({ _id: player._id }, { $set: { status: 'winner' } });
        await db.collection('game_events').insertOne({
          storyId,
          type: 'win',
          message: `${userId} has won the game!`,
          actor: userId,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({
          success: true,
          message: 'Congratulations! You have collected all required artifacts and reached the goal. You win!',
          win: true,
          artifact,
          challengeId,
          solved: true
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Challenge solved! You have been awarded the artifact.',
      artifact,
      challengeId,
      solved: true
    });
  } catch (error) {
    console.error('Error in /api/game/challenge/solve:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

// TODO: Add unit tests for challenge solving logic 