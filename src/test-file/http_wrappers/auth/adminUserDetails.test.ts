import request from 'sync-request-curl';
import config from '../../../config.json';

const SERVER_URL = `${config.url}:${config.port}`;

beforeEach(() => {
  request('DELETE', `${SERVER_URL}/v1/clear`);
});

describe('HTTP route: GET /v1/admin/user/details', () => {
  test('returns correct details for a newly registered user (200 OK)', () => {
    const registerRes = request('POST', `${SERVER_URL}/v1/admin/auth/register`, {
      json: {
        email: 'lebron@gmail.com',
        password: 'password123',
        nameFirst: 'James',
        nameLast: 'Lebron',
      },
    });

    const { session } = JSON.parse(registerRes.body.toString()) as { session: string };

    const res = request('GET', `${SERVER_URL}/v1/admin/user/details`, {
      headers: { session },
    });
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body.toString());
    expect(body).toStrictEqual({
      user: {
        userId: expect.any(Number),
        name: 'James Lebron',
        email: 'lebron@gmail.com',
        numSuccessfulLogins: 1,
        numFailedPasswordsSinceLastLogin: 0,
      },
    });
  });

  test('increments numSuccessfulLogins after a valid login', () => {
    let res = request('POST', `${SERVER_URL}/v1/admin/auth/register`, {
      json: {
        email: 'mjordan@test.com',
        password: 'password123',
        nameFirst: 'Michael',
        nameLast: 'Jordan',
      },
    });
    expect(res.statusCode).toBe(200);

    res = request('POST', `${SERVER_URL}/v1/admin/auth/login`, {
      json: {
        email: 'mjordan@test.com',
        password: 'password123',
      },
    });
    expect(res.statusCode).toBe(200);

    const { session } = JSON.parse(res.body.toString()) as { session: string };

    const detailsRes = request('GET', `${SERVER_URL}/v1/admin/user/details`, {
      headers: { session },
    });
    expect(detailsRes.statusCode).toBe(200);

    const body = JSON.parse(detailsRes.body.toString());
    expect(body.user.numSuccessfulLogins).toBe(2);
    expect(body.user.numFailedPasswordsSinceLastLogin).toBe(0);
  });

  test('increments numFailedPasswordsSinceLastLogin after failed password attempts', () => {
    let res = request('POST', `${SERVER_URL}/v1/admin/auth/register`, {
      json: {
        email: 'kobebryant@test.com',
        password: 'mamba123',
        nameFirst: 'Kobe',
        nameLast: 'Bryant',
      },
    });
    expect(res.statusCode).toBe(200);

    for (let i = 0; i < 2; i++) {
      const badLogin = request('POST', `${SERVER_URL}/v1/admin/auth/login`, {
        json: {
          email: 'kobebryant@test.com',
          password: 'wrongpassword',
        },
      });
      expect(badLogin.statusCode).toBe(400);
    }

    res = request('POST', `${SERVER_URL}/v1/admin/auth/login`, {
      json: {
        email: 'kobebryant@test.com',
        password: 'mamba123',
      },
    });
    expect(res.statusCode).toBe(200);
    const { session } = JSON.parse(res.body.toString()) as { session: string };

    const detailsRes = request('GET', `${SERVER_URL}/v1/admin/user/details`, {
      headers: { session },
    });
    expect(detailsRes.statusCode).toBe(200);

    const body = JSON.parse(detailsRes.body.toString());
    expect(body.user.numFailedPasswordsSinceLastLogin).toBe(0);
    expect(body.user.numSuccessfulLogins).toBeGreaterThanOrEqual(1);
  });

  test('returns 401 UNAUTHORISED when session header missing', () => {
    const res = request('GET', `${SERVER_URL}/v1/admin/user/details`);
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body.toString());
    expect(body).toStrictEqual({
      error: 'UNAUTHORISED',
      message: expect.any(String),
    });
  });

  test('returns 401 UNAUTHORISED when session invalid', () => {
    const res = request('POST', `${SERVER_URL}/v1/admin/auth/register`, {
      json: {
        email: 'invalidsession@test.com',
        password: 'password123',
        nameFirst: 'Invalid',
        nameLast: 'Session',
      },
    });
    expect(res.statusCode).toBe(200);
    const { session } = JSON.parse(res.body.toString()) as { session: string };

    const clearRes = request('DELETE', `${SERVER_URL}/v1/clear`);
    expect(clearRes.statusCode).toBe(200);

    const invalidRes = request('GET', `${SERVER_URL}/v1/admin/user/details`, {
      headers: { session },
    });
    expect(invalidRes.statusCode).toBe(401);
    const body = JSON.parse(invalidRes.body.toString());
    expect(body).toStrictEqual({
      error: 'UNAUTHORISED',
      message: expect.any(String),
    });
  });
});
