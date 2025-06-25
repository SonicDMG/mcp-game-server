import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/astradb';
import type { Challenge, GameItem } from '../../types';
import { checkHasMessages, pollMessagesForUser } from '../../utils/checkHasMessages';
import type { Message } from '../../utils/checkHasMessages';

/**
 * Flexible solution matching utility for game challenges
 * Works across different game themes (fantasy, sci-fi, historical, etc.)
 * Uses generic linguistic patterns rather than game-specific logic
 */
function isFlexibleMatch(playerSolution: string, expectedSolution: string): boolean {
  const player = playerSolution.trim().toLowerCase();
  const expected = expectedSolution.trim().toLowerCase();
  
  // Debug logging for troubleshooting
  console.log(`[FlexibleMatch] Comparing: "${player}" vs "${expected}"`);
  
  // Strategy 1: Exact match
  if (player === expected) {
    console.log(`[FlexibleMatch] ✅ Exact match`);
    return true;
  }
  
  // Strategy 2: Remove common stop words and compare core concepts
  const stopWords = [
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'use', 'using', 'do', 'does', 'did', 'make', 'makes', 'try', 'tries', 'get', 'gets',
    'go', 'goes', 'come', 'comes', 'take', 'takes', 'give', 'gives', 'put', 'puts'
  ];
  
  const extractCoreWords = (text: string): string[] => {
    return text.split(/[\s\-_,.;:!?()]+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .map(word => word.replace(/[^\w]/g, '').toLowerCase())
      .filter(word => word.length > 0);
  };
  
  const expectedCore = extractCoreWords(expected);
  const playerCore = extractCoreWords(player);
  
  // Strategy 3: Check if player captured the essential concepts
  if (expectedCore.length > 0) {
    const conceptMatches = expectedCore.filter(expectedWord => 
      playerCore.some(playerWord => {
        // Exact match
        if (playerWord === expectedWord) return true;
        // Partial match (handles plurals, verb forms, etc.)
        if (playerWord.includes(expectedWord) && expectedWord.length > 3) return true;
        if (expectedWord.includes(playerWord) && playerWord.length > 3) return true;
        // Handle common word variations
        return areWordsRelated(playerWord, expectedWord);
      })
    );
    
    // If player matched most key concepts, consider it correct
    const matchPercentage = conceptMatches.length / expectedCore.length;
    console.log(`[FlexibleMatch] Concept match: ${conceptMatches.length}/${expectedCore.length} (${Math.round(matchPercentage * 100)}%)`);
    console.log(`[FlexibleMatch] Expected core: [${expectedCore.join(', ')}]`);
    console.log(`[FlexibleMatch] Player core: [${playerCore.join(', ')}]`);
    console.log(`[FlexibleMatch] Concept matches: [${conceptMatches.join(', ')}]`);
    
    if (matchPercentage >= 0.6) { // Lowered threshold to be more forgiving
      console.log(`[FlexibleMatch] ✅ Concept match (${Math.round(matchPercentage * 100)}%)`);
      return true;
    }
  }
  
  // Strategy 4: Check if player's answer contains the expected answer as substring
  if (expected.length > 4 && player.includes(expected)) {
    console.log(`[FlexibleMatch] ✅ Player contains expected`);
    return true;
  }
  
  // Strategy 5: Check if expected answer contains player's answer as substring
  if (player.length > 4 && expected.includes(player)) {
    console.log(`[FlexibleMatch] ✅ Expected contains player`);
    return true;
  }
  
  console.log(`[FlexibleMatch] ❌ No match found`);
  return false;
}

/**
 * Checks if two words are linguistically related
 * Handles common variations without game-specific logic
 */
function areWordsRelated(word1: string, word2: string): boolean {
  // Handle plurals and basic verb forms
  const normalize = (word: string): string => {
    // Remove common suffixes and handle compound words
    return word.replace(/(s|es|ed|ing|er|est|ly|type)$/, '').toLowerCase();
  };
  
  const norm1 = normalize(word1);
  const norm2 = normalize(word2);
  
  // Check if normalized forms match
  if (norm1 === norm2) return true;
  
  // Handle compound words like "water-type" vs "water"
  if (word1.includes('type') || word2.includes('type')) {
    const base1 = word1.replace(/[-_]?type$/, '');
    const base2 = word2.replace(/[-_]?type$/, '');
    if (base1 === base2 || base1.includes(base2) || base2.includes(base1)) {
      return true;
    }
  }
  
  // Check if one is a substring of the other (for longer words)
  if ((norm1.length > 3 && norm2.includes(norm1)) || 
      (norm2.length > 3 && norm1.includes(norm2))) {
    return true;
  }
  
  return false;
}

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
    // Compare solution using flexible matching
    // Try multiple solution fields for maximum flexibility
    let isCorrect = false;
    
    // Strategy: Try expectedAction first (usually shorter/more specific), then solution, then completionCriteria
    if (challenge.expectedAction) {
      isCorrect = isFlexibleMatch(solution, challenge.expectedAction);
    }
    
    // If expectedAction didn't match, try the longer solution text
    if (!isCorrect && challenge.solution) {
      isCorrect = isFlexibleMatch(solution, challenge.solution);
    }
    
    // Handle completion criteria for non-text challenges
    if (!isCorrect && challenge.completionCriteria) {
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
        error: 'Incorrect solution. Try again!',
        challenge: challenge,
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

    // --- WIN CONDITION CHECK (updated for finalTask) ---
    if (story) {
      if (story.finalTask) {
        const inFinalTaskRoom = player.currentLocation === story.finalTask.locationId;
        const hasAllFinalArtifacts = story.finalTask.requiredArtifacts.every((artifactId: string) => player.inventory.includes(artifactId));
        if (inFinalTaskRoom && hasAllFinalArtifacts) {
          await playersCollection.updateOne({ _id: player._id }, { $set: { status: 'winner' } });
          await db.collection('game_events').insertOne({
            storyId,
            type: 'win',
            message: `${userId} has completed the final task and won the game!`,
            actor: userId,
            timestamp: new Date().toISOString(),
          });
          return NextResponse.json({
            success: true,
            message: 'Congratulations! You have completed the final epic task and won the game!',
            win: true,
            artifact,
            challengeId,
            solved: true,
            challenge: challenge,
            finalTask: story.finalTask,
            hint: story.finalTask.hints?.[0] || undefined
          });
        }
      } else if (story.goalRoomId && story.requiredArtifacts) {
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
            solved: true,
            challenge: challenge,
          });
        }
      }
    }

    let hasMessages = false;
    let messages: Message[] = [];
    if (userId && storyId) {
      hasMessages = await checkHasMessages(userId, storyId);
      if (hasMessages) {
        const pollResult = await pollMessagesForUser(userId, storyId);
        messages = pollResult.messages;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Challenge solved! You have been awarded the artifact.',
      artifact,
      challengeId,
      solved: true,
      challenge: challenge,
      hasMessages,
      messages
    });
  } catch (error) {
    console.error('Error in /api/game/challenge/solve:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

// TODO: Add unit tests for challenge solving logic 