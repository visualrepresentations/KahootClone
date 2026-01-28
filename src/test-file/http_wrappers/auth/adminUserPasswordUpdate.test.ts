import request from 'sync-request-curl';
import config from '../../../config.json';
const port = config.port;
const url = config.url;

let session: string; // Make session a global variable so every test can use it

// Helper function to be able to easily convert the function testing code to the jsonified body
function createPasswordUpdateBody(oldPassword: string, newPassword: string) {
  return {
    oldPassword: oldPassword,
    newPassword: newPassword,
  };
}

beforeEach(() => {
  request('DELETE', `${url}:${port}/v1/clear`);

  const res = request('POST', `${url}:${port}/v1/admin/auth/register`, {
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'yuchao.jiang@nmsu.edu.au',
      password: 'password123',
      nameFirst: 'yuchao',
      nameLast: 'jiang'
    })
  });
  const responseBody = JSON.parse(res.body.toString());
  session = responseBody.session;
});

describe('adminUserPasswordUpdate', () => {
  describe('Successful password update', () => {
    test('Correct return type', () => {
      const result = createPasswordUpdateBody('password123', 'password676');
      const res = request('PUT', `${url}:${port}/v1/admin/user/password`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify(result),
      });
      expect(res.statusCode).toStrictEqual(200);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({});
    });
  });

  describe('Unauthorised', () => {
    test('invalid userId', () => {
      const result = createPasswordUpdateBody('password123', 'password676');
      const res = request('PUT', `${url}:${port}/v1/admin/user/password`, {
        headers: {
          'Content-Type': 'application/json',
          'session': '0'
        },
        body: JSON.stringify(result),
      });
      expect(res.statusCode).toStrictEqual(401);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'UNAUTHORISED',
        message: expect.any(String),
      });
    });
  });

  describe('INVALID_OLD_PASSWORD', () => {
    test('Incorrect old password', () => {
      const result = createPasswordUpdateBody('password12', 'password676');
      const res = request('PUT', `${url}:${port}/v1/admin/user/password`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify(result),
      });
      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_OLD_PASSWORD',
        message: expect.any(String),
      });
    });
  });

  describe('INVALID_NEW_PASSWORD', () => {
    test('Old password matches new password', () => {
      const result = createPasswordUpdateBody('password123', 'password123');
      const res = request('PUT', `${url}:${port}/v1/admin/user/password`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify(result),
      });
      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_NEW_PASSWORD',
        message: expect.any(String),
      });
    });

    test('New password already used', () => {
      const result1 = createPasswordUpdateBody('password123', 'password676');
      request('PUT', `${url}:${port}/v1/admin/user/password`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify(result1),
      });

      const result2 = createPasswordUpdateBody('password676', 'password123');
      const res = request('PUT', `${url}:${port}/v1/admin/user/password`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify(result2),
      });
      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_NEW_PASSWORD',
        message: expect.any(String),
      });
    });

    test('New password too short', () => {
      const result = createPasswordUpdateBody('password123', 'pass1');
      const res = request('PUT', `${url}:${port}/v1/admin/user/password`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify(result),
      });
      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_PASSWORD',
        message: expect.any(String),
      });
    });

    test('New password does not contain number', () => {
      const result = createPasswordUpdateBody('password123', 'passpasspass');
      const res = request('PUT', `${url}:${port}/v1/admin/user/password`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify(result),
      });
      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_PASSWORD',
        message: expect.any(String),
      });
    });

    test('New password does not contain letter', () => {
      const result = createPasswordUpdateBody('password123', '1234567890');
      const res = request('PUT', `${url}:${port}/v1/admin/user/password`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify(result),
      });
      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_PASSWORD',
        message: expect.any(String),
      });
    });
  });
});
