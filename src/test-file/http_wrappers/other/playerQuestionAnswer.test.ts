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
      description: 'Testing player answer submission'
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
      thumbnailUrl: 'http://example.com/image.jpg',
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
      timeLimit: 10,
      points: 5,
      thumbnailUrl: 'http://example.com/image.jpg',
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

describe('playerQuestionAnswerHTTP', () => {
  test('400 - invalid player ID', () => {
    const res = request('PUT', `${url}:${port}/v1/player/9999/question/1/answer`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answerIds: [1] })
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body as string).error).toBe('INVALID_PLAYER_ID');
  });

  test('400 - invalid question position (less than 1)', () => {
    const { player1Id } = setupGameWithPlayers();

    const res = request('PUT', `${url}:${port}/v1/player/${player1Id}/question/0/answer`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answerIds: [1] })
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body as string).error).toBe('INVALID_POSITION');
  });

  test('400 - invalid question position (greater than total questions)', () => {
    const { player1Id } = setupGameWithPlayers();
    const res = request('PUT', `${url}:${port}/v1/player/${player1Id}/question/3/answer`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answerIds: [1] })
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body as string).error).toBe('INVALID_POSITION');
  });

  test('400 - game not currently on this question', () => {
    const { player1Id } = setupGameWithPlayers();

    // Try to answer question 2 when game is on question 1
    const res = request('PUT', `${url}:${port}/v1/player/${player1Id}/question/2/answer`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answerIds: [1] })
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body as string).error).toBe('INVALID_POSITION');
  });

  // test('400 - incompatible game state (not QUESTION_OPEN)', () => {
  //   const { session, quizId, gameId, player1Id } = setupGameWithPlayers();

  //   request('PUT', `${url}:${port}/v1/admin/quiz/${quizId}/game/${gameId}`, {
  //     headers: { 'Content-Type': 'application/json', session },
  //     body: JSON.stringify({ action: 'GO_TO_ANSWER' })
  //   });

  //   const res = request('PUT', `${url}:${port}/v1/player/${player1Id}/question/1/answer`, {
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ answerIds: [1] })
  //   });

  //   expect(res.statusCode).toBe(400);
  //   expect(JSON.parse(res.body as string).error).toBe('INCOMPATIBLE_GAME_STATE');
  // });

  test('400 - invalid answer IDs (empty array)', () => {
    const gameInfo = setupGameWithPlayers();
    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'SKIP_COUNTDOWN' })
    });

    const res = request('PUT', `${url}:${port}/v1/player/${gameInfo.player1Id}/question/1/answer`, { // 2 → 1
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answerIds: [] })
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body as string).error).toBe('INVALID_ANSWER_IDS');
  });

  test('400 - invalid answer IDs (duplicate answer IDs)', () => {
    const gameInfo = setupGameWithPlayers();

    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'SKIP_COUNTDOWN' })
    });

    const res = request('PUT', `${url}:${port}/v1/player/${gameInfo.player1Id}/question/1/answer`, { // 2 → 1
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answerIds: [1, 1] })
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body as string).error).toBe('INVALID_ANSWER_IDS');
  });

  test('400 - invalid answer IDs (non-existent answer ID)', () => {
    const gameInfo = setupGameWithPlayers();

    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'SKIP_COUNTDOWN' })
    });

    const res = request('PUT', `${url}:${port}/v1/player/${gameInfo.player1Id}/question/1/answer`, { // 2 → 1
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answerIds: [999] })
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body as string).error).toBe('INVALID_ANSWER_IDS');
  });

  test('200 - successfully submit single answer', () => {
    const gameInfo = setupGameWithPlayers();

    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'SKIP_COUNTDOWN' })
    });

    const res = request('PUT', `${url}:${port}/v1/player/${gameInfo.player1Id}/question/1/answer`, { // 2 → 1
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answerIds: [1] }) // Correct answer for first question
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string)).toStrictEqual({});
  });

  test('200 - successfully submit multiple answers', () => {
    const gameInfo = setupGameWithPlayers();

    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'SKIP_COUNTDOWN' })
    });

    const res = request('PUT', `${url}:${port}/v1/player/${gameInfo.player1Id}/question/1/answer`, { // 2 → 1
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answerIds: [1, 2] }) // Multiple answers
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string)).toStrictEqual({});
  });

  test('200 - multiple players can submit answers independently', () => {
    const gameInfo = setupGameWithPlayers();

    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'SKIP_COUNTDOWN' })
    });
    // Player 1 submits answer
    const res1 = request('PUT', `${url}:${port}/v1/player/${gameInfo.player1Id}/question/1/answer`, { // 2 → 1
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answerIds: [1] })
    });

    // Player 2 submits different answer
    const res2 = request('PUT', `${url}:${port}/v1/player/${gameInfo.player2Id}/question/1/answer`, { // 2 → 1
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answerIds: [2] })
    });

    expect(res1.statusCode).toBe(200);
    expect(res2.statusCode).toBe(200);
  });

  test('200 - player can resubmit answer while in QUESTION_OPEN state', () => {
    const gameInfo = setupGameWithPlayers();

    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'SKIP_COUNTDOWN' })
    });
    // First submission
    const res1 = request('PUT', `${url}:${port}/v1/player/${gameInfo.player1Id}/question/1/answer`, { // 2 → 1
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answerIds: [1] })
    });

    // Resubmit with different answer (should be same player for resubmission test)
    const res2 = request('PUT', `${url}:${port}/v1/player/${gameInfo.player1Id}/question/1/answer`, { // 2 → 1, and player1Id for both
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answerIds: [2] })
    });

    expect(res1.statusCode).toBe(200);
    expect(res2.statusCode).toBe(200);
  });
});
