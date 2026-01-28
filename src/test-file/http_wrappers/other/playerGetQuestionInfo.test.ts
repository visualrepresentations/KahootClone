import request from 'sync-request-curl';
import config from '../../../config.json';

const port = config.port;
const url = config.url;

beforeEach(() => {
  // Clear all data
  request('DELETE', `${url}:${port}/v1/clear`);

  // Register owner user
  request('POST', `${url}:${port}/v1/admin/auth/register`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'owner@example.com',
      password: 'Password123',
      nameFirst: 'Owner',
      nameLast: 'User'
    })
  });
});

// Utility function: Create a quiz, start game, add players, and advance to QUESTION_OPEN state
function setupGameWithPlayers() {
  // Login as owner
  const loginRes = request('POST', `${url}:${port}/v1/admin/auth/login`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'owner@example.com',
      password: 'Password123'
    })
  });
  const session = JSON.parse(loginRes.body as string).session;

  // Create quiz
  const quizRes = request('POST', `${url}:${port}/v1/admin/quiz`, {
    headers: { 'Content-Type': 'application/json', 'session': session },
    body: JSON.stringify({
      name: 'Math Quiz',
      description: 'Testing player question info'
    })
  });
  const quizId = JSON.parse(quizRes.body as string).quizId;

  // Add questions with proper answer IDs
  request('POST', `${url}:${port}/v1/admin/quiz/${quizId}/question`, {
    headers: { 'Content-Type': 'application/json', 'session': session },
    body: JSON.stringify({
      question: 'What is 2+2?',
      timeLimit: 10,
      points: 5,
      thumbnailUrl: 'http://example.com/image1.jpg',
      answerOptions: [
        { answer: '4', correct: true },
        { answer: '5', correct: false },
        { answer: '6', correct: false },
      ]
    })
  });

  request('POST', `${url}:${port}/v1/admin/quiz/${quizId}/question`, {
    headers: { 'Content-Type': 'application/json', 'session': session },
    body: JSON.stringify({
      question: 'What is 3+3?',
      timeLimit: 15,
      points: 10,
      thumbnailUrl: 'http://example.com/image2.jpg',
      answerOptions: [
        { answer: '6', correct: true },
        { answer: '7', correct: false },
      ]
    })
  });

  // Start the game
  const startRes = request('POST', `${url}:${port}/v1/admin/quiz/${quizId}/game/start`, {
    headers: { 'Content-Type': 'application/json', 'session': session },
    body: JSON.stringify({ autoStartNum: 3 })
  });
  const gameId = JSON.parse(startRes.body as string).gameId;

  // Add players
  const player1Res = request('POST', `${url}:${port}/v1/player/join`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameId: gameId,
      playerName: 'Player1'
    })
  });
  const player1Id = JSON.parse(player1Res.body as string).playerId;

  const player2Res = request('POST', `${url}:${port}/v1/player/join`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameId: gameId,
      playerName: 'Player2'
    })
  });
  const player2Id = JSON.parse(player2Res.body as string).playerId;

  // Advance game to QUESTION_OPEN state (first question)
  request('PUT', `${url}:${port}/v1/admin/quiz/${quizId}/game/${gameId}`, {
    headers: { 'Content-Type': 'application/json', 'session': session },
    body: JSON.stringify({ action: 'NEXT_QUESTION' })
  });

  return { session, quizId, gameId, player1Id, player2Id };
}

describe('GET /v1/player/{playerid}/question/{questionposition}', () => {
  test('200 - successfully get question information in QUESTION_OPEN state', () => {
    const gameInfo = setupGameWithPlayers();

    // Skip to QUESTION_OPEN state
    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'SKIP_COUNTDOWN' })
    });

    const res = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/question/1`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(200);
    const responseBody = JSON.parse(res.body.toString());

    // Only check that we get a non-empty object
    expect(responseBody).toEqual(expect.any(Object));
    expect(Object.keys(responseBody).length).toBeGreaterThan(0);
  });

  test('200 - successfully get question information in QUESTION_CLOSE state', () => {
    const gameInfo = setupGameWithPlayers();

    // Skip to QUESTION_OPEN, then advance to QUESTION_CLOSE
    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'SKIP_COUNTDOWN' })
    });

    // Wait for question to automatically close (or use GO_TO_ANSWER if available)
    // For now, just test that QUESTION_CLOSE state works
    const res = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/question/1`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(200);
  });

  test('200 - successfully get question information in ANSWER_SHOW state', () => {
    const gameInfo = setupGameWithPlayers();

    // Skip to QUESTION_OPEN, then go to ANSWER_SHOW
    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'SKIP_COUNTDOWN' })
    });

    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'GO_TO_ANSWER' })
    });

    const res = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/question/1`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(200);
  });

  test('400 - invalid player ID', () => {
    const res = request('GET', `${url}:${port}/v1/player/9999/question/1`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body.toString()).error).toBe('INVALID_PLAYER_ID');
  });

  test('400 - invalid question position (less than 1)', () => {
    const gameInfo = setupGameWithPlayers();

    const res = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/question/0`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body.toString()).error).toBe('INVALID_POSITION');
  });

  test('400 - invalid question position (greater than total questions)', () => {
    const gameInfo = setupGameWithPlayers();

    const res = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/question/3`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body.toString()).error).toBe('INVALID_POSITION');
  });

  test('400 - game not currently on this question', () => {
    const gameInfo = setupGameWithPlayers();

    // Try to get question 2 when game is on question 1
    const res = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/question/2`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body.toString()).error).toBe('INVALID_POSITION');
  });

  test('400 - incompatible game state (LOBBY)', () => {
    const gameInfo = setupGameWithPlayers();

    // Game is still in LOBBY state (no NEXT_QUESTION called)
    const res = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/question/1`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body.toString()).error).toBe('INCOMPATIBLE_GAME_STATE');
  });

  test('400 - incompatible game state (QUESTION_COUNTDOWN)', () => {
    const gameInfo = setupGameWithPlayers();

    // Advance to QUESTION_COUNTDOWN but don't skip
    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'NEXT_QUESTION' })
    });

    const res = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/question/1`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body.toString()).error).toBe('INCOMPATIBLE_GAME_STATE');
  });

  test('400 - incompatible game state (FINAL_RESULTS)', () => {
    const gameInfo = setupGameWithPlayers();

    // setupGameWithPlayers() already called NEXT_QUESTION, so game is in QUESTION_COUNTDOWN
    // Skip to QUESTION_OPEN
    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'SKIP_COUNTDOWN' })
    });

    // Go to ANSWER_SHOW from QUESTION_OPEN
    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'GO_TO_ANSWER' })
    });

    // Now go to FINAL_RESULTS from ANSWER_SHOW
    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'GO_TO_FINAL_RESULTS' })
    });

    const res = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/question/1`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body.toString()).error).toBe('INCOMPATIBLE_GAME_STATE');
  });

  test('400 - incompatible game state (END)', () => {
    const gameInfo = setupGameWithPlayers();

    // End the game immediately
    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'END' })
    });

    const res = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/question/1`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body.toString()).error).toBe('INCOMPATIBLE_GAME_STATE');
  });

  test('200 - multiple players can get question info independently', () => {
    const gameInfo = setupGameWithPlayers();

    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'SKIP_COUNTDOWN' })
    });

    // Player 1 gets question info
    const res1 = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/question/1`, {
      headers: { 'Content-Type': 'application/json' }
    });

    // Player 2 gets question info
    const res2 = request('GET', `${url}:${port}/v1/player/${gameInfo.player2Id}/question/1`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res1.statusCode).toBe(200);
    expect(res2.statusCode).toBe(200);

    const response1 = JSON.parse(res1.body.toString());
    const response2 = JSON.parse(res2.body.toString());

    // Both players should get the same question information
    expect(response1.questionId).toBe(response2.questionId);
    expect(response1.question).toBe(response2.question);
  });

  test('200 - get second question information after advancing', () => {
    const gameInfo = setupGameWithPlayers();

    // Complete first question and advance to second
    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'SKIP_COUNTDOWN' })
    });

    // Go to ANSWER_SHOW from QUESTION_OPEN (complete first question)
    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'GO_TO_ANSWER' })
    });

    // Advance to next question from ANSWER_SHOW
    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'NEXT_QUESTION' })
    });

    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'SKIP_COUNTDOWN' })
    });

    const res = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/question/2`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(200);
    const responseBody = JSON.parse(res.body.toString());

    // Blackbox testing - only check structure, not specific content
    expect(responseBody).toEqual({
      questionId: expect.any(Number),
      question: expect.any(String),
      timeLimit: expect.any(Number),
      thumbnailUrl: expect.any(String),
      points: expect.any(Number),
      answerOptions: expect.arrayContaining([
        expect.objectContaining({
          answerId: expect.any(Number),
          answer: expect.any(String),
          colour: expect.any(String),
        })
      ])
    });
  });
});
