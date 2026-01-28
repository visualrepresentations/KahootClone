import request from 'sync-request-curl';
import config from '../../../config.json';

const port = config.port;
const url = config.url;

beforeEach(() => {
  request('DELETE', `${url}:${port}/v1/clear`);

  for (const user of [
    { email: 'owner@gmail.com', password: 'Password123!', nameFirst: 'Owner', nameLast: 'User' },
    { email: 'intruder@fmail.com', password: 'Password123!', nameFirst: 'badguy', nameLast: 'User' },
  ]) {
    request('POST', `${url}:${port}/v1/admin/auth/register`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
  }
});

function setupGame() {
  const loginRes = request('POST', `${url}:${port}/v1/admin/auth/login`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'owner@gmail.com',
      password: 'Password123!'
    })
  });
  const session = JSON.parse(loginRes.body as string).session;

  const quizRes = request('POST', `${url}:${port}/v1/admin/quiz`, {
    headers: { 'Content-Type': 'application/json', session },
    body: JSON.stringify({
      name: 'Quiz',
      description: 'test game results'
    })
  });
  const quizId = JSON.parse(quizRes.body as string).quizId;

  // Add questions
  for (const [q, a, b] of [
    ['What is 6+7?', '13', '67'],
    ['What is 4+1?', '41', '5']
  ]) {
    request('POST', `${url}:${port}/v1/admin/quiz/${quizId}/question`, {
      headers: { 'Content-Type': 'application/json', session },
      body: JSON.stringify({
        question: q,
        timeLimit: 10,
        points: 5,
        thumbnailUrl: 'http://example.com/image.jpg',
        answerOptions: [
          { answer: a, correct: true },
          { answer: b, correct: false },
        ]
      })
    });
  }

  const startRes = request('POST', `${url}:${port}/v1/admin/quiz/${quizId}/game/start`, {
    headers: { 'Content-Type': 'application/json', session },
    body: JSON.stringify({ autoStartNum: 3 })
  });
  const gameId = JSON.parse(startRes.body as string).gameId;

  return { session, quizId, gameId };
}

describe('adminGetQuizGameResultsHTTP', () => {
  test('401: missing session header', () => {
    const { quizId, gameId } = setupGame();

    const res = request('GET', `${url}:${port}/v1/admin/quiz/${quizId}/game/${gameId}/results`);

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body as string);
    expect(body.error).toBe('UNAUTHORISED');
    expect(typeof body.message).toBe('string');
  });

  test('401: invalid session', () => {
    const { quizId, gameId } = setupGame();

    const res = request('GET', `${url}:${port}/v1/admin/quiz/${quizId}/game/${gameId}/results`, {
      headers: { session: 'invalid_session_12345' }
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body as string);
    expect(body.error).toBe('UNAUTHORISED');
  });

  test('403: valid session but not quiz owner', () => {
    const { quizId, gameId } = setupGame();

    const intruderLogin = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'intruder@fmail.com',
        password: 'Password123!'
      })
    });
    const intruderSession = JSON.parse(intruderLogin.body as string).session;

    const res = request('GET', `${url}:${port}/v1/admin/quiz/${quizId}/game/${gameId}/results`, {
      headers: { session: intruderSession }
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body as string);
    expect(body.error).toBe('INVALID_QUIZ_ID');
  });

  test('403: quiz does not exist', () => {
    const { session, gameId } = setupGame();

    const res = request('GET', `${url}:${port}/v1/admin/quiz/9999/game/${gameId}/results`, {
      headers: { session }
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body as string);
    expect(body.error).toBe('INVALID_QUIZ_ID');
  });

  test('400: invalid gameId', () => {
    const { session, quizId } = setupGame();

    const res = request('GET', `${url}:${port}/v1/admin/quiz/${quizId}/game/9999/results`, {
      headers: { session }
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body as string);
    expect(body.error).toBe('INVALID_GAME_ID');
  });

  test('400: game not in FINAL_RESULTS state (LOBBY)', () => {
    const { session, quizId, gameId } = setupGame();

    const res = request('GET', `${url}:${port}/v1/admin/quiz/${quizId}/game/${gameId}/results`, {
      headers: { session }
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body as string);
    expect(body.error).toBe('INCOMPATIBLE_GAME_STATE');
    expect(typeof body.message).toBe('string');
  });

  test('400: game not in FINAL_RESULTS state (ACTIVE)', () => {
    const { session, quizId, gameId } = setupGame();

    // move game to active state
    request('PUT', `${url}:${port}/v1/admin/quiz/${quizId}/game/${gameId}`, {
      headers: { 'Content-Type': 'application/json', session },
      body: JSON.stringify({ action: 'NEXT_QUESTION' })
    });

    const res = request('GET', `${url}:${port}/v1/admin/quiz/${quizId}/game/${gameId}/results`, {
      headers: { session }
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body as string);
    expect(body.error).toBe('INCOMPATIBLE_GAME_STATE');
    expect(typeof body.message).toBe('string');
  });
});
