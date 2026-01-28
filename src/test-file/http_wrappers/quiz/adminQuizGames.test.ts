import request from 'sync-request-curl';
import config from '../../../config.json';

const SERVER_URL = `${config.url}:${config.port}`;

interface RequestOptions {
  headers?: Record<string, string>;
  json?: Record<string, unknown>;
}

const post = (path: string, options: RequestOptions = {}) =>
  request('POST', `${SERVER_URL}${path}`, options);

const get = (path: string, options: RequestOptions = {}) =>
  request('GET', `${SERVER_URL}${path}`, options);

const del = (path: string, options: RequestOptions = {}) =>
  request('DELETE', `${SERVER_URL}${path}`, options);

function registerUser(email: string) {
  const res = post('/v1/admin/auth/register', {
    json: {
      email,
      password: 'Password123',
      nameFirst: 'Test',
      nameLast: 'User',
    },
  });
  expect(res.statusCode).toBe(200);
  const body = JSON.parse(res.body.toString());
  return body.session as string;
}

function createQuiz(session: string, name: string) {
  const res = post('/v1/admin/quiz', {
    headers: { session },
    json: {
      name,
      description: 'desc',
    },
  });
  expect(res.statusCode).toBe(200);
  const body = JSON.parse(res.body.toString());
  return body.quizId as number;
}

beforeEach(() => {
  del('/v1/clear');
});

describe('GET /v1/admin/quiz/:quizid/games', () => {
  test('200 - returns empty arrays when quiz exists but has no games', () => {
    const session = registerUser('user1@example.com');
    const quizId = createQuiz(session, 'Quiz A');

    const res = get(`/v1/admin/quiz/${quizId}/games`, {
      headers: { session },
    });
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body.toString());
    expect(body).toStrictEqual({
      activeGames: [],
      inactiveGames: [],
    });
  });

  test('401 - missing session header', () => {
    const session = registerUser('user2@example.com');
    const quizId = createQuiz(session, 'Quiz B');

    const res = get(`/v1/admin/quiz/${quizId}/games`);
    expect(res.statusCode).toBe(401);

    const body = JSON.parse(res.body.toString());
    expect(body.error).toBe('UNAUTHORISED');
    expect(typeof body.message).toBe('string');
  });

  test('401 - invalid session token', () => {
    const session = registerUser('user3@example.com');
    const quizId = createQuiz(session, 'Quiz C');

    const res = get(`/v1/admin/quiz/${quizId}/games`, {
      headers: { session: 'invalid-session-token' },
    });
    expect(res.statusCode).toBe(401);

    const body = JSON.parse(res.body.toString());
    expect(body.error).toBe('UNAUTHORISED');
  });

  test('403 - quiz does not exist', () => {
    const session = registerUser('user4@example.com');

    const res = get('/v1/admin/quiz/999999/games', {
      headers: { session },
    });
    expect(res.statusCode).toBe(403);

    const body = JSON.parse(res.body.toString());
    expect(body.error).toBe('INVALID_QUIZ_ID');
  });

  test('403 - quiz exists but not owned by requesting user', () => {
    const ownerSession = registerUser('owner@example.com');
    const quizId = createQuiz(ownerSession, 'Owner Quiz');

    const otherSession = registerUser('other@example.com');

    const res = get(`/v1/admin/quiz/${quizId}/games`, {
      headers: { session: otherSession },
    });
    expect(res.statusCode).toBe(403);

    const body = JSON.parse(res.body.toString());
    expect(body.error).toBe('INVALID_QUIZ_ID');
  });
});
