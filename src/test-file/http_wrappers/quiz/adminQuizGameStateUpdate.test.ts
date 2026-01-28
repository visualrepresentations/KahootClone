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

// Utility: create quiz and start game
function setupGame() {
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
      name: 'Physics Quiz',
      description: 'Testing NEXT_QUESTION logic'
    })
  });
  const quizId = JSON.parse(quizRes.body as string).quizId;

  // Add questions
  for (const [q, a, b] of [
    ['What is 2+2?', '4', '5'],
    ['What is 3+3?', '6', '7']
  ]) {
    request('POST', `${url}:${port}/v1/admin/quiz/${quizId}/question`, {
      headers: { 'Content-Type': 'application/json', 'session': session },
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

  // Start game
  const startRes = request('POST', `${url}:${port}/v1/admin/quiz/${quizId}/game/start`, {
    headers: { 'Content-Type': 'application/json', 'session': session },
    body: JSON.stringify({ autoStartNum: 3 })
  });

  const gameId = JSON.parse(startRes.body as string).gameId;
  return { session, quizId, gameId };
}

describe('adminQuizGameStateUpdateHTTP', () => {
  test('401 - missing or invalid session', () => {
    const { quizId, gameId } = setupGame();

    const res = request('PUT', `${url}:${port}/v1/admin/quiz/${quizId}/game/${gameId}`, {
      headers: { 'Content-Type': 'application/json' }, // <-- no session
      body: JSON.stringify({ action: 'NEXT_QUESTION' })
    });

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

    const res = request('PUT', `${url}:${port}/v1/admin/quiz/${quizId}/game/${gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': intruderSession },
      body: JSON.stringify({ action: 'NEXT_QUESTION' })
    });

    expect(res.statusCode).toBe(403);
  });

  test('400 - invalid gameId', () => {
    const { session, quizId } = setupGame();

    const res = request('PUT', `${url}:${port}/v1/admin/quiz/${quizId}/game/9999`, {
      headers: { 'Content-Type': 'application/json', 'session': session },
      body: JSON.stringify({ action: 'NEXT_QUESTION' })
    });

    expect(res.statusCode).toBe(400);
  });

  test('400 - invalid action', () => {
    const { session, quizId, gameId } = setupGame();

    const res = request('PUT', `${url}:${port}/v1/admin/quiz/${quizId}/game/${gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': session },
      body: JSON.stringify({ action: 'INVALID_ACTION' })
    });

    expect(res.statusCode).toBe(400);
  });

  test('400 - incompatible game state on second NEXT_QUESTION', () => {
    const { session, quizId, gameId } = setupGame();

    // First NEXT_QUESTION (allowed: LOBBY → QUESTION_COUNTDOWN)
    const res1 = request('PUT', `${url}:${port}/v1/admin/quiz/${quizId}/game/${gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': session },
      body: JSON.stringify({ action: 'NEXT_QUESTION' })
    });
    expect(res1.statusCode).toBe(200);

    // Second NEXT_QUESTION (NOT allowed from QUESTION_COUNTDOWN)
    const res2 = request('PUT', `${url}:${port}/v1/admin/quiz/${quizId}/game/${gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': session },
      body: JSON.stringify({ action: 'NEXT_QUESTION' })
    });
    expect(res2.statusCode).toBe(400);
  });

  test('200 - successfully advance to next question (first NEXT_QUESTION)', () => {
    const { session, quizId, gameId } = setupGame();

    const res = request('PUT', `${url}:${port}/v1/admin/quiz/${quizId}/game/${gameId}`, {
      headers: { 'Content-Type': 'application/json', 'session': session },
      body: JSON.stringify({ action: 'NEXT_QUESTION' })
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string)).toStrictEqual({});
  });
});
