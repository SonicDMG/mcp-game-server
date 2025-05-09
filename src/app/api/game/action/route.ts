import { NextRequest, NextResponse } from 'next/server';
import { getPlayerState, updatePlayerState, getLocation, getItem, getStory } from '../dataService';
import type { Challenge } from '../types';
import db from '@/lib/astradb';

/**
 * POST /api/game/action
 * Handles generic game actions (move, examine, take, use, inventory, look) for a player.
 * Not used by the MCP tool (MCP uses more specific endpoints).
 * May be used by the frontend or for legacy/custom integrations.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId, storyId, action, target } = body;

    if (!playerId || !storyId || !action) {
      return NextResponse.json(
        { error: 'playerId, storyId, and action are required' },
        { status: 400 }
      );
    }

    // Get current player state
    const playerState = await getPlayerState(playerId, storyId);
    if (!playerState) {
      return NextResponse.json(
        { success: false, needsPlayer: true, error: 'Player not found. Please start the game first.', hint: 'Call /api/game/start to create a new player.' },
        { status: 200 }
      );
    }

    // Process different actions
    switch (action) {
      case 'move': {
        const location = await getLocation(target, storyId);
        if (!location) {
          return NextResponse.json(
            { error: 'Location not found' },
            { status: 404 }
          );
        }

        // Check if player can access this location
        const requirements = location.requirements || { condition: 'none' };
        if (requirements.condition !== 'none') {
          if (requirements.item && !playerState.inventory.includes(requirements.item)) {
            return NextResponse.json(
              { error: 'Required item not in inventory' },
              { status: 400 }
            );
          }
        }

        // Update player state
        playerState.currentLocation = target;
        if (!playerState.discoveredLocations.includes(target)) {
          playerState.discoveredLocations.push(target);
        }

        // --- Challenge Trigger Integration ---
        // Fetch story and check for unsolved challenges at this location
        const story = await getStory(storyId);
        let triggeredChallenges: Challenge[] = [];
        if (story && story.challenges) {
          triggeredChallenges = story.challenges.filter(
            (c) => c.locationId === target && (!c.solvedBy || !c.solvedBy.includes(playerId))
          );
        }
        // Return challenge info in the response if any are found
        if (triggeredChallenges.length > 0) {
          // Always include hints in triggeredChallenges for agent use
          return NextResponse.json({
            ...playerState,
            storyId,
            userId: playerId,
            triggeredChallenges: triggeredChallenges.map(c => ({ ...c })), // ensure hints included
            message: `You encounter a challenge: ${triggeredChallenges.map(c => c.name).join(', ')}`
            // Agents: Present hints one-by-one as users attempt to solve
          });
        }
        break;
      }

      case 'take': {
        const currentLocation = await getLocation(playerState.currentLocation, storyId);
        if (!currentLocation?.items.includes(target)) {
          return NextResponse.json(
            { error: 'Item not found in current location' },
            { status: 404 }
          );
        }

        const item = await getItem(target, storyId);
        if (!item?.canTake) {
          return NextResponse.json(
            { error: 'Item cannot be taken' },
            { status: 400 }
          );
        }

        // Add item to inventory and update location
        if (!playerState.inventory.includes(target)) {
          playerState.inventory.push(target);
        }
        if (!playerState.gameProgress.itemsFound.includes(target)) {
          playerState.gameProgress.itemsFound.push(target);
        }
        break;
      }

      case 'examine': {
        // Just return success as examining doesn't change state
        break;
      }

      case 'attempt_challenge': {
        // New: Attempt to complete a challenge
        const { challengeId, answer } = body;
        // Fetch story and challenge
        const story = await getStory(storyId);
        if (!story || !story.challenges) {
          return NextResponse.json({ error: 'Story or challenges not found' }, { status: 404 });
        }
        const challenge = story.challenges.find((c) => c.id === challengeId);
        if (!challenge) {
          return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
        }
        // Check if player is at the correct location
        if (playerState.currentLocation !== challenge.locationId) {
          return NextResponse.json({ error: 'You must be at the challenge location to attempt it.' }, { status: 400 });
        }
        // Check requirements (e.g., required items)
        let requirementsMet = true;
        if (challenge.requirements) {
          if (challenge.requirements.item && !playerState.inventory.includes(challenge.requirements.item)) {
            requirementsMet = false;
          }
          if (challenge.requirements.items && Array.isArray(challenge.requirements.items)) {
            for (const reqItem of challenge.requirements.items) {
              if (!playerState.inventory.includes(reqItem)) {
                requirementsMet = false;
                break;
              }
            }
          }
        }
        if (!requirementsMet) {
          return NextResponse.json({ error: 'You do not meet the requirements to attempt this challenge.' }, { status: 400 });
        }
        // Check if already solved
        if (challenge.solvedBy && challenge.solvedBy.includes(playerId)) {
          return NextResponse.json({ error: 'You have already completed this challenge.' }, { status: 400 });
        }
        // Validate solution/completion
        let solved = false;
        if (challenge.solution) {
          // For riddles, puzzles, etc. (case-insensitive match)
          if (typeof answer === 'string' && challenge.solution.toLowerCase().includes(answer.toLowerCase())) {
            solved = true;
          }
        } else if (challenge.completionCriteria) {
          // For rituals, actions, etc. (simple check: must provide a string that matches or contains the criteria)
          if (typeof answer === 'string' && challenge.completionCriteria.toLowerCase().includes(answer.toLowerCase())) {
            solved = true;
          }
          // Optionally, check usedItems if needed
        }
        if (!solved) {
          return NextResponse.json({
            error: 'Challenge not completed. Try again or check your answer/requirements.',
            hint: challenge.description,
            challenge: challenge // Include challenge with hints for agent use
            // Agents: Present hints one-by-one as users attempt to solve
          }, { status: 200 });
        }
        // Award artifact
        if (!playerState.inventory.includes(challenge.artifactId)) {
          playerState.inventory.push(challenge.artifactId);
        }
        // Mark challenge as solved for this player
        if (!challenge.solvedBy) challenge.solvedBy = [];
        challenge.solvedBy.push(playerId);
        // Update player progress
        playerState.gameProgress = playerState.gameProgress || { itemsFound: [], puzzlesSolved: [], storyProgress: 0 };
        if (!playerState.gameProgress.itemsFound.includes(challenge.artifactId)) {
          playerState.gameProgress.itemsFound.push(challenge.artifactId);
        }
        // Save updated player state
        const success = await updatePlayerState(playerState);
        // Save updated challenge solvedBy in the story
        // (Direct DB update for solvedBy array)
        const storiesCollection = db.collection('game_stories');
        await storiesCollection.updateOne(
          { id: storyId, 'challenges.id': challengeId },
          { $addToSet: { 'challenges.$.solvedBy': playerId } }
        );
        if (!success) {
          return NextResponse.json({ error: 'Failed to update player state' }, { status: 500 });
        }
        return NextResponse.json({
          success: true,
          message: `Challenge completed! You have earned the artifact: ${challenge.artifactId}`,
          artifactId: challenge.artifactId,
          inventory: playerState.inventory,
          challenge: challenge // Include challenge with hints for agent use
          // Agents: Present hints one-by-one as users attempt to solve
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Save updated player state
    const success = await updatePlayerState(playerState);
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update player state' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...playerState,
      storyId,
      userId: playerId
    });
  } catch (error) {
    console.error('Error in /api/game/action:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process action' },
      { status: 500 }
    );
  }
} 