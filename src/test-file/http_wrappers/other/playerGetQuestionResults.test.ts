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
      nameFirst: 'Owner',
      nameLast: 'User'
    })
  });
});

function setupGameWithPlayers(startGame: boolean = true) {
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

  // advance game to first question if startGame is true
  if (startGame) {
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
  }

  return { session, quizId, gameId, player1Id, player2Id };
}

describe('GET /v1/player/{playerid}/question/{questionposition}/results', () => {
  test('400: invalid player id', () => {
    // create game with a player to get a valid player id
    const gameInfo = setupGameWithPlayers();

    // use an invalid player id that won't exist
    const invalidPlayerId = gameInfo.player2Id + 1;

    const res = request('GET', `${url}:${port}/v1/player/${invalidPlayerId}/question/1/results`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body.toString()).error).toBe('INVALID_PLAYER_ID');
  });

  test('400: invalid question position (<1)', () => {
    const gameInfo = setupGameWithPlayers();

    const res = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/question/0/results`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body.toString()).error).toBe('INVALID_POSITION');
  });

  test('400: invalid question position (>questionNo)', () => {
    const gameInfo = setupGameWithPlayers();

    const res = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/question/3/results`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body.toString()).error).toBe('INVALID_POSITION');
  });

  test('400: game not currently on this question', () => {
    const gameInfo = setupGameWithPlayers();

    // try to get question 2 results when the game is still on question 1
    const res = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/question/2/results`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body.toString()).error).toBe('INVALID_POSITION');
  });

  test('400: incompatible game state (LOBBY)', () => {
    const gameInfo = setupGameWithPlayers(false);

    // game is still in lobby (not started)
    const res = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/question/1/results`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body.toString()).error).toBe('INCOMPATIBLE_GAME_STATE');
  });

  test('400: incompatible game state (QUESTION_OPEN)', () => {
    const gameInfo = setupGameWithPlayers(false);

    // Create a new game, start it, but dont advance it to ANSWER_SHOW
    const startRes1 = request('POST', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/start`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ autoStartNum: 3 })
    });
    const gameId1 = JSON.parse(startRes1.body as string).gameId;

    const playerRes = request('POST', `${url}:${port}/v1/player/join`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: gameId1,
        playerName: 'Player3'
      })
    });
    const playerId = JSON.parse(playerRes.body as string).playerId;

    // advance to question open
    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameId1}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'NEXT_QUESTION' })
    });

    request('PUT', `${url}:${port}/v1/admin/quiz/${gameInfo.quizId}/game/${gameId1}`, {
      headers: { 'Content-Type': 'application/json', 'session': gameInfo.session },
      body: JSON.stringify({ action: 'SKIP_COUNTDOWN' })
    });

    const res = request('GET', `${url}:${port}/v1/player/${playerId}/question/1/results`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body.toString()).error).toBe('INCOMPATIBLE_GAME_STATE');
  });

  test('200: successfully get question results in ANSWER_SHOW state', () => {
    const gameInfo = setupGameWithPlayers();

    const res = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/question/1/results`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(200);
    const responseBody = JSON.parse(res.body.toString());

    // check structure
    expect(responseBody).toHaveProperty('questionId');
    expect(responseBody).toHaveProperty('playersCorrect');
    expect(responseBody).toHaveProperty('averageAnswerTime');
    expect(responseBody).toHaveProperty('percentCorrect');

    // check types
    expect(typeof responseBody.questionId).toBe('number');
    expect(Array.isArray(responseBody.playersCorrect)).toBe(true);
    expect(typeof responseBody.averageAnswerTime).toBe('number');
    expect(typeof responseBody.percentCorrect).toBe('number');
  });

  test('200: multiple players can get question results independently', () => {
    const gameInfo = setupGameWithPlayers();

    // player 1 gets results
    const res1 = request('GET', `${url}:${port}/v1/player/${gameInfo.player1Id}/question/1/results`, {
      headers: { 'Content-Type': 'application/json' }
    });

    // player 2 gets results
    const res2 = request('GET', `${url}:${port}/v1/player/${gameInfo.player2Id}/question/1/results`, {
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res1.statusCode).toBe(200);
    expect(res2.statusCode).toBe(200);

    const response1 = JSON.parse(res1.body.toString());
    const response2 = JSON.parse(res2.body.toString());

    // both players should get the same results
    expect(response1.questionId).toBe(response2.questionId);
    expect(response1.averageAnswerTime).toBe(response2.averageAnswerTime);
    expect(response1.percentCorrect).toBe(response2.percentCorrect);
  });
});
