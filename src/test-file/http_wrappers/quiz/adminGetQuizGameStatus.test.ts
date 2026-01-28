import request from 'sync-request-curl';
import config from '../../../config.json';

const port = config.port;
const url = config.url;

beforeEach(() => {
  request('DELETE', `${url}:${port}/v1/clear`);

  for (const user of [
    { email: 'owner@example.com', password: 'Password123', nameFirst: 'Owner', nameLast: 'User' },
    { email: 'intruder@example.com', password: 'Password123', nameFirst: 'Intruder', nameLast: 'User' },
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
      email: 'owner@example.com',
      password: 'Password123'
    })
  });
  const session = JSON.parse(loginRes.body as string).session;

  const quizRes = request('POST', `${url}:${port}/v1/admin/quiz`, {
    headers: { 'Content-Type': 'application/json', session },
    body: JSON.stringify({
      name: 'Physics Quiz',
      description: 'For testing game status'
    })
  });
  const quizId = JSON.parse(quizRes.body as string).quizId;

  for (const [q, a, b] of [
    ['What is 2+2?', '4', '5'],
    ['What is 3+3?', '6', '7']
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

describe('adminGetQuizGameStatusHTTP', () => {
  test('401 - missing or invalid session', () => {
    const { quizId, gameId } = setupGame();

    const res = request('GET', `${url}:${port}/v1/admin/quiz/${quizId}/game/${gameId}`);

    expect(res.statusCode).toBe(401);
  });

  test('403 - valid session but not quiz owner', () => {
    const { quizId, gameId } = setupGame();

    const intruderLogin = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'intruder@example.com',
        password: 'Password123'
      })
    });
    const intruderSession = JSON.parse(intruderLogin.body as string).session;

    const res = request('GET', `${url}:${port}/v1/admin/quiz/${quizId}/game/${gameId}`, {
      headers: { session: intruderSession }
    });

    expect(res.statusCode).toBe(403);
  });

  test('400 - invalid gameId', () => {
    const { session, quizId } = setupGame();

    const res = request('GET', `${url}:${port}/v1/admin/quiz/${quizId}/game/9999`, {
      headers: { session }
    });

    expect(res.statusCode).toBe(400);
  });

  test('200 - successfully get game status', () => {
    const { session, quizId, gameId } = setupGame();

    const res = request('GET', `${url}:${port}/v1/admin/quiz/${quizId}/game/${gameId}`, {
      headers: { session }
    });

    expect(res.statusCode).toBe(200);
  });
});
