import request from 'sync-request-curl';
import config from '../../../config.json';
const port = config.port;
const url = config.url;

function registerValidUser(): string {
  const res = request('POST', `${url}:${port}/v1/admin/auth/register`, {
    json: {
      email: `test${Math.random()}@example.com`,
      password: 'password123',
      nameFirst: 'Test',
      nameLast: 'User'
    }
  });
  return JSON.parse(res.body.toString()).session;
}

beforeEach(() => {
  request('DELETE', `${url}:${port}/v1/clear`);
});

describe('adminUserLogoutHTTP', () => {
  test('Success: Valid session logout', () => {
    const session = registerValidUser();

    const logoutRes = request('POST', `${url}:${port}/v1/admin/auth/logout`, {
      headers: { session }
    });

    expect(logoutRes.statusCode).toBe(200);
    expect(JSON.parse(logoutRes.body.toString())).toEqual({});

    const userDetailsRes = request('GET', `${url}:${port}/v1/admin/user/details`, {
      headers: { session }
    });
    expect(userDetailsRes.statusCode).toBe(401);
  });

  test('Error: Empty session string', () => {
    const logoutRes = request('POST', `${url}:${port}/v1/admin/auth/logout`, {
      headers: { session: '' }
    });

    expect(logoutRes.statusCode).toBe(401);
    expect(JSON.parse(logoutRes.body.toString())).toEqual({
      error: 'UNAUTHORISED',
      message: 'session id is empty or invalid'
    });
  });

  test('Error: Invalid session ID', () => {
    const logoutRes = request('POST', `${url}:${port}/v1/admin/auth/logout`, {
      headers: { session: 'invalid_session_12345' }
    });

    expect(logoutRes.statusCode).toBe(401);
    expect(JSON.parse(logoutRes.body.toString())).toEqual({
      error: 'UNAUTHORISED',
      message: 'session id is empty or invalid'
    });
  });

  test('Error: No session header provided', () => {
    const logoutRes = request('POST', `${url}:${port}/v1/admin/auth/logout`);
    expect(logoutRes.statusCode).toBe(401);
  });

  test('Double logout with same session', () => {
    const session = registerValidUser();

    const firstLogout = request('POST', `${url}:${port}/v1/admin/auth/logout`, {
      headers: { session }
    });
    expect(firstLogout.statusCode).toBe(200);

    const secondLogout = request('POST', `${url}:${port}/v1/admin/auth/logout`, {
      headers: { session }
    });
    expect(secondLogout.statusCode).toBe(401);
  });

  test('Multiple users can logout independently', () => {
    const user1Session = registerValidUser();
    const user2Session = registerValidUser();

    const user1Logout = request('POST', `${url}:${port}/v1/admin/auth/logout`, {
      headers: { session: user1Session }
    });
    expect(user1Logout.statusCode).toBe(200);

    const user2Details = request('GET', `${url}:${port}/v1/admin/user/details`, {
      headers: { session: user2Session }
    });
    expect(user2Details.statusCode).toBe(200);

    const user2Logout = request('POST', `${url}:${port}/v1/admin/auth/logout`, {
      headers: { session: user2Session }
    });
    expect(user2Logout.statusCode).toBe(200);
  });
});
