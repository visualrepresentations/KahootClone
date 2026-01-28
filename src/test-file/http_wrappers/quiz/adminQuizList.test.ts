import request from 'sync-request-curl';
import config from '../../../config.json';

const SERVER_URL = `${config.url}:${config.port}`;

beforeEach(() => {
  request('DELETE', `${SERVER_URL}/v1/clear`);
});

describe('HTTP route: GET /v1/admin/quiz/list', () => {
  let session: string;

  beforeEach(() => {
    let res = request('POST', `${SERVER_URL}/v1/admin/auth/register`, {
      json: {
        email: 'quizlist@test.com',
        password: 'Password123',
        nameFirst: 'Quiz',
        nameLast: 'Lister',
      },
    });
    expect(res.statusCode).toBe(200);

    res = request('POST', `${SERVER_URL}/v1/admin/auth/login`, {
      json: {
        email: 'quizlist@test.com',
        password: 'Password123',
      },
    });
    expect(res.statusCode).toBe(200);
    session = JSON.parse(res.body.toString()).session;
  });

  test('returns an empty quiz list for a new user (200 OK)', () => {
    const res = request('GET', `${SERVER_URL}/v1/admin/quiz/list`, {
      headers: { session },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body.toString())).toStrictEqual({ quizzes: [] });
  });

  test('returns quizzes created by the same user in order of creation', () => {
    let res = request('POST', `${SERVER_URL}/v1/admin/quiz`, {
      headers: { session },
      json: { name: 'Quiz 1', description: 'Desc 1' },
    });
    expect(res.statusCode).toBe(200);

    res = request('POST', `${SERVER_URL}/v1/admin/quiz`, {
      headers: { session },
      json: { name: 'Quiz 2', description: 'Desc 2' },
    });
    expect(res.statusCode).toBe(200);

    const listRes = request('GET', `${SERVER_URL}/v1/admin/quiz/list`, {
      headers: { session },
    });
    expect(listRes.statusCode).toBe(200);

    const body = JSON.parse(listRes.body.toString());
    expect(body.quizzes.length).toBe(2);
    expect(body.quizzes[0].name).toBe('Quiz 1');
    expect(body.quizzes[1].name).toBe('Quiz 2');
  });

  test('returns only quizzes belonging to the correct user', () => {
    const resA = request('POST', `${SERVER_URL}/v1/admin/auth/register`, {
      json: {
        email: 'a@gmail.com',
        password: 'Password123',
        nameFirst: 'User',
        nameLast: 'AA',
      },
    });
    const sessionA: string = JSON.parse(resA.body.toString()).session;

    const resB = request('POST', `${SERVER_URL}/v1/admin/auth/register`, {
      json: {
        email: 'b@gmail.com',
        password: 'Password123',
        nameFirst: 'User',
        nameLast: 'BB',
      },
    });
    const sessionB: string = JSON.parse(resB.body.toString()).session;

    request('POST', `${SERVER_URL}/v1/admin/quiz`, {
      headers: { session: sessionA },
      json: { name: 'Quiz A', description: 'A desc' },
    });
    request('POST', `${SERVER_URL}/v1/admin/quiz`, {
      headers: { session: sessionB },
      json: { name: 'Quiz B', description: 'B desc' },
    });

    const listA = request('GET', `${SERVER_URL}/v1/admin/quiz/list`, {
      headers: { session: sessionA },
    });
    const listB = request('GET', `${SERVER_URL}/v1/admin/quiz/list`, {
      headers: { session: sessionB },
    });

    const bodyA = JSON.parse(listA.body.toString());
    const bodyB = JSON.parse(listB.body.toString());

    expect(bodyA.quizzes.length).toBe(1);
    expect(bodyA.quizzes[0].name).toBe('Quiz A');
    expect(bodyB.quizzes.length).toBe(1);
    expect(bodyB.quizzes[0].name).toBe('Quiz B');
  });

  test('returns 401 UNAUTHORISED when session header is missing', () => {
    const res = request('GET', `${SERVER_URL}/v1/admin/quiz/list`);
    expect(res.statusCode).toBe(401);

    const body = JSON.parse(res.body.toString());
    expect(body.error).toBe('UNAUTHORISED');
    expect(body.message).toEqual(expect.any(String));
  });

  test('returns 401 UNAUTHORISED when session is invalid', () => {
    const res = request('GET', `${SERVER_URL}/v1/admin/quiz/list`, {
      headers: { session: 'invalid-session-id' },
    });
    expect(res.statusCode).toBe(401);

    const body = JSON.parse(res.body.toString());
    expect(body.error).toBe('UNAUTHORISED');
    expect(body.message).toEqual(expect.any(String));
  });

  test('returns 401 after clear wipes data', () => {
    request('POST', `${SERVER_URL}/v1/admin/quiz`, {
      headers: { session },
      json: { name: 'Temp Quiz', description: 'Temporary' },
    });

    const clearRes = request('DELETE', `${SERVER_URL}/v1/clear`);
    expect(clearRes.statusCode).toBe(200);

    const res = request('GET', `${SERVER_URL}/v1/admin/quiz/list`, {
      headers: { session },
    });
    expect(res.statusCode).toBe(401);

    const body = JSON.parse(res.body.toString());
    expect(body.error).toBe('UNAUTHORISED');
  });
});
