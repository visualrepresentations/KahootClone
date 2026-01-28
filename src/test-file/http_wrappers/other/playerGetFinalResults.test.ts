import request from 'sync-request-curl';
import config from '../../../config.json';

const port = config.port;
const url = config.url;

beforeEach(() => {
  request('DELETE', `${url}:${port}/v1/clear`);

  request('POST', `${url}:${port}/v1/admin/auth/register`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'owner@example.com',
      password: 'Password123!',
      nameFirst: 'John',
      nameLast: 'McAfee'
    })
  });
});

function setupGameWithPlayers() {
  const loginRes = request('POST', `${url}:${port}/v1/admin/auth/login`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'owner@example.com',
      password: 'Password123!'
    })
  });
  const session = JSON.parse(loginRes.body as string).session;

  const quizRes = request('POST', `${url}:${port}/v1/admin/quiz`, {
    headers: { 'Content-Type': 'application/json', 'session': session },
    body: JSON.stringify({
      name: 'The Quiz of all time',
      description: 'all human knowledge'
    })
  });
  const quizId = JSON.parse(quizRes.body as string).quizId;

  request('POST', `${url}:${port}/v1/admin/quiz/${quizId}/question`, {
    headers: { 'Content-Type': 'application/json', 'session': session },
    body: JSON.stringify({
      question: 'What is 6+7?',
      timeLimit: 10,
      points: 5,
      thumbnailUrl: 'http://example.com/image.jpg',
      answerOptions: [
        { answer: '11', correct: false },
        { answer: '67', correct: true },
        { answer: '15', correct: false },
      ]
    })
  });

  request('POST', `${url}:${port}/v1/admin/quiz/${quizId}/question`, {
    headers: { 'Content-Type': 'application/json', 'session': session },
    body: JSON.stringify({
      question: 'What is 4+1?',
      timeLimit: 15,
      points: 10,
      thumbnailUrl: 'http://example.com/image.jpg',
      answerOptions: [
        { answer: '3', correct: false },
        { answer: '41', correct: true },
        { answer: '7', correct: false },
      ]
    })
  });

  const startRes = request('POST', `${url}:${port}/v1/admin/quiz/${quizId}/game/start`, {
    headers: { 'Content-Type': 'application/json', 'session': session },
    body: JSON.stringify({ autoStartNum: 3 })
  });
  const gameId = JSON.parse(startRes.body as string).gameId;

  const player1Res = request('POST', `${url}:${port}/v1/player/join`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameId: gameId,
      playerName: 'player1'
    })
  });
  const player1Id = JSON.parse(player1Res.body as string).playerId;

  const player2Res = request('POST', `${url}:${port}/v1/player/join`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameId: gameId,
      playerName: 'player2'
    })
  });
  const player2Id = JSON.parse(player2Res.body as string).playerId;

  return { session, quizId, gameId, player1Id, player2Id };
}

function goToFinalResults(session: string, quizId: number, gameId: number) {
  // advance through first question
  request('PUT', `${url}:${port}/v1/admin/quiz/${quizId}/game/${gameId}`, {
    headers: { 'Content-Type': 'application/json', 'session': session },
    body: JSON.stringify({ action: 'NEXT_QUESTION' })
  });

  request('PUT', `${url}:${port}/v1/admin/quiz/${quizId}/game/${gameId}`, {
    headers: { 'Content-Type': 'application/json', 'session': session },
    body: JSON.stringify({ action: 'SKIP_COUNTDOWN' })
  });

  request('PUT', `${url}:${port}/v1/admin/quiz/${quizId}/game/${gameId}`, {
    headers: { 'Content-Type': 'application/json', 'session': session },
    body: JSON.stringify({ action: 'GO_TO_ANSWER' })
  });

  // Advance through second question
  request('PUT', `${url}:${port}/v1/admin/quiz/${quizId}/game/${gameId}`, {
    headers: { 'Content-Type': 'application/json', 'session': session },
    body: JSON.stringify({ action: 'NEXT_QUESTION' })
  });

  request('PUT', `${url}:${port}/v1/admin/quiz/${quizId}/game/${gameId}`, {
    headers: { 'Content-Type': 'application/json', 'session': session },
    body: JSON.stringify({ action: 'SKIP_COUNTDOWN' })
  });

  request('PUT', `${url}:${port}/v1/admin/quiz/${quizId}/game/${gameId}`, {
    headers: { 'Content-Type': 'application/json', 'session': session },
    body: JSON.stringify({ action: 'GO_TO_ANSWER' })
  });

  // Go to final results
  request('PUT', `${url}:${port}/v1/admin/quiz/${quizId}/game/${gameId}`, {
    headers: { 'Content-Type': 'application/json', 'session': session },
    body: JSON.stringify({ action: 'GO_TO_FINAL_RESULTS' })
  });
}

describe('GET /v1/player/{playerid}/results', () => {
  test('400: invalid player id', () => {
    const gameInfo = setupGameWithPlayers();
    goToFinalResults(gameInfo.session, gameInfo.quizId, gameInfo.gameId);

    // use an invalid player id that won't exist
    const invalidPlayerId = gameInfo.player2Id + 1;

    const res = request('GET', `${url}:${port}/v1/player/${invalidPlayerId}/results`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body.toString()).error).toBe('INVALID_PLAYER_ID');
  });

  test('400: incompatible game state (LOBBY)', () => {
    const gameInfo = setupGameWithPlayers();

    // game is still in lobby (hasnt started)
    const res = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/results`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body.toString()).error).toBe('INCOMPATIBLE_GAME_STATE');
  });

  test('400: incompatible game state (QUESTION_COUNTDOWN)', () => {
    const gameInfo = setupGameWithPlayers();

    // Advance to QUESTION_COUNTDOWN
    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'NEXT_QUESTION' })
    });

    const res = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/results`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body.toString()).error).toBe('INCOMPATIBLE_GAME_STATE');
  });

  test('400: incompatible game state (QUESTION_OPEN)', () => {
    const gameInfo = setupGameWithPlayers();

    // advance to question open
    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'NEXT_QUESTION' })
    });

    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'SKIP_COUNTDOWN' })
    });

    const res = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/results`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body.toString()).error).toBe('INCOMPATIBLE_GAME_STATE');
  });

  test('400: incompatible game state (ANSWER_SHOW)', () => {
    const gameInfo = setupGameWithPlayers();

    // Advance to ANSWER_SHOW
    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'NEXT_QUESTION' })
    });

    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'SKIP_COUNTDOWN' })
    });

    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'GO_TO_ANSWER' })
    });

    const res = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/results`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body.toString()).error).toBe('INCOMPATIBLE_GAME_STATE');
  });

  test('400: incompatible game state (END)', () => {
    const gameInfo = setupGameWithPlayers();

    // End the game immediately
    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameInfo.gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'END' })
    });

    const res = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/results`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body.toString()).error).toBe('INCOMPATIBLE_GAME_STATE');
  });

  test('200: successfully get final results in FINAL_RESULTS state', () => {
    const gameInfo = setupGameWithPlayers();
    goToFinalResults(gameInfo.session, gameInfo.quizId, gameInfo.gameId);

    const res = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/results`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(200);
    const responseBody = JSON.parse(res.body.toString());

    // check structure
    expect(responseBody).toHaveProperty('usersRankedByScore');
    expect(responseBody).toHaveProperty('questionResults');

    // check types
    expect(Array.isArray(responseBody.usersRankedByScore)).toBe(true);
    expect(Array.isArray(responseBody.questionResults)).toBe(true);

    // check usersRankedByScore structure
    if (responseBody.usersRankedByScore.length > 0) {
      expect(responseBody.usersRankedByScore[0]).toHaveProperty('playerName');
      expect(responseBody.usersRankedByScore[0]).toHaveProperty('score');
      expect(typeof responseBody.usersRankedByScore[0].playerName).toBe('string');
      expect(typeof responseBody.usersRankedByScore[0].score).toBe('number');
    }

    // check questionResults structure
    if (responseBody.questionResults.length > 0) {
      expect(responseBody.questionResults[0]).toHaveProperty('questionId');
      expect(responseBody.questionResults[0]).toHaveProperty('playersCorrect');
      expect(responseBody.questionResults[0]).toHaveProperty('averageAnswerTime');
      expect(responseBody.questionResults[0]).toHaveProperty('percentCorrect');
      expect(typeof responseBody.questionResults[0].questionId).toBe('number');
      expect(Array.isArray(responseBody.questionResults[0].playersCorrect)).toBe(true);
      expect(typeof responseBody.questionResults[0].averageAnswerTime).toBe('number');
      expect(typeof responseBody.questionResults[0].percentCorrect).toBe('number');
    }
  });

  test('200: multiple players can get final results independently', () => {
    const gameInfo = setupGameWithPlayers();
    goToFinalResults(gameInfo.session, gameInfo.quizId, gameInfo.gameId);

    // player 1 gets results
    const res1 = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/results`, {
      headers: { 'Content-Type': 'application/json' }
    });

    // player 2 gets results
    const res2 = request('GET', `${url}:${port}/v1/player/${gameInfo.player2Id}/results`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res1.statusCode).toBe(200);
    expect(res2.statusCode).toBe(200);

    const response1 = JSON.parse(res1.body.toString());
    const response2 = JSON.parse(res2.body.toString());

    // both players should get the same results
    expect(response1.usersRankedByScore).toEqual(response2.usersRankedByScore);
    expect(response1.questionResults).toEqual(response2.questionResults);
  });

  test('200: final results contain all questions', () => {
    const gameInfo = setupGameWithPlayers();
    goToFinalResults(gameInfo.session, gameInfo.quizId, gameInfo.gameId);

    const res = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/results`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(200);
    const responseBody = JSON.parse(res.body.toString());

    // Should have results for all 2 questions
    expect(responseBody.questionResults.length).toBe(2);
  });

  test('200: usersRankedByScore contains all players', () => {
    const gameInfo = setupGameWithPlayers();
    goToFinalResults(gameInfo.session, gameInfo.quizId, gameInfo.gameId);

    const res = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/results`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(200);
    const responseBody = JSON.parse(res.body.toString());

    // Should have both players in the ranking
    expect(responseBody.usersRankedByScore.length).toBe(2);

    // Check that both player names are present
    const playerNames = responseBody.usersRankedByScore.map((p: { playerName: string }) => p.playerName);
    expect(playerNames).toContain('player1');
    expect(playerNames).toContain('player2');
  });
});
