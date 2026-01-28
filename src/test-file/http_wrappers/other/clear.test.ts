import request from 'sync-request-curl';
import config from '../../../config.json';

const SERVER_URL = `${config.url}:${config.port}`;

beforeEach(() => {
  request('DELETE', `${SERVER_URL}/v1/clear`);
});

describe('HTTP route: DELETE /v1/clear', () => {
  test('returns 200 and empty object when called', () => {
    const res = request('DELETE', `${SERVER_URL}/v1/clear`);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body.toString())).toStrictEqual({});
  });

  test('resets state across user and quiz endpoints', () => {
    const registerRes = request('POST', `${SERVER_URL}/v1/admin/auth/register`, {
      json: {
        email: 'lebron@gmail.com',
        password: 'Password123',
        nameFirst: 'James',
        nameLast: 'Lebron',
      },
    });
    expect(registerRes.statusCode).toBe(200);
    const { session } = JSON.parse(registerRes.body.toString()) as { session: string };

    const quizRes = request('POST', `${SERVER_URL}/v1/admin/quiz`, {
      headers: { session },
      json: { name: 'LebQuiz', description: 'quiz4leb' },
    });
    expect(quizRes.statusCode).toBe(200);

    const clearRes = request('DELETE', `${SERVER_URL}/v1/clear`);
    expect(clearRes.statusCode).toBe(200);
    expect(JSON.parse(clearRes.body.toString())).toStrictEqual({});

    const afterClear = request('GET', `${SERVER_URL}/v1/admin/quiz/list`, {
      headers: { session },
    });
    expect(afterClear.statusCode).toBe(401);
    expect(JSON.parse(afterClear.body.toString())).toMatchObject({
      error: 'UNAUTHORISED',
    });
  });

  test('resets multiple users and quizzes correctly', () => {
    const resA = request('POST', `${SERVER_URL}/v1/admin/auth/register`, {
      json: {
        email: 'a@gmail.com',
        password: 'PasswordA1',
        nameFirst: 'A',
        nameLast: 'User',
      },
    });
    const sessionA = JSON.parse(resA.body.toString()).session as string;

    const resB = request('POST', `${SERVER_URL}/v1/admin/auth/register`, {
      json: {
        email: 'b@gmail.com',
        password: 'PasswordB1',
        nameFirst: 'B',
        nameLast: 'User',
      },
    });
    const sessionB = JSON.parse(resB.body.toString()).session as string;

    request('POST', `${SERVER_URL}/v1/admin/quiz`, {
      headers: { session: sessionA },
      json: { name: 'Quiz A', description: 'desc A' },
    });
    request('POST', `${SERVER_URL}/v1/admin/quiz`, {
      headers: { session: sessionB },
      json: { name: 'Quiz B', description: 'desc B' },
    });

    const clearRes = request('DELETE', `${SERVER_URL}/v1/clear`);
    expect(clearRes.statusCode).toBe(200);

    const checkA = request('GET', `${SERVER_URL}/v1/admin/quiz/list`, {
      headers: { session: sessionA },
    });
    expect(checkA.statusCode).toBe(401);
    expect(JSON.parse(checkA.body.toString()).error).toBe('UNAUTHORISED');

    const checkB = request('GET', `${SERVER_URL}/v1/admin/quiz/list`, {
      headers: { session: sessionB },
    });
    expect(checkB.statusCode).toBe(401);
    expect(JSON.parse(checkB.body.toString()).error).toBe('UNAUTHORISED');
  });

  test('allows fresh registration after clearing', () => {
    const firstRes = request('POST', `${SERVER_URL}/v1/admin/auth/register`, {
      json: {
        email: 'first@gmail.com',
        password: 'Password123',
        nameFirst: 'First',
        nameLast: 'User',
      },
    });
    expect(firstRes.statusCode).toBe(200);

    const clearRes = request('DELETE', `${SERVER_URL}/v1/clear`);
    expect(clearRes.statusCode).toBe(200);

    const secondRes = request('POST', `${SERVER_URL}/v1/admin/auth/register`, {
      json: {
        email: 'second@gmail.com',
        password: 'Password123',
        nameFirst: 'Second',
        nameLast: 'User',
      },
    });
    expect(secondRes.statusCode).toBe(200);

    const { session } = JSON.parse(secondRes.body.toString()) as { session: string };
    expect(typeof session).toBe('string');
  });

  test('can be called multiple times without error', () => {
    let res = request('DELETE', `${SERVER_URL}/v1/clear`);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body.toString())).toStrictEqual({});

    res = request('DELETE', `${SERVER_URL}/v1/clear`);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body.toString())).toStrictEqual({});
  });
});
