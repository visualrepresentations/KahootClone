import request from 'sync-request-curl';
import config from '../../../config.json';
const port = config.port;
const url = config.url;

let session: string; // Make session a global variable so every test can use it

// Helper function to be able to easily convert the function testing code to the jsonified body
function createUpdateBody(email: string, nameFirst: string, nameLast: string) {
  return {
    email: email,
    nameFirst: nameFirst,
    nameLast: nameLast,
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
      password: 'yuchaojiang123',
      nameFirst: 'yuchao',
      nameLast: 'jiang'
    })
  });
  const responseBody = JSON.parse(res.body.toString());
  session = responseBody.session;
});

describe('adminUserDetailsUpdate', () => {
  describe('Successful update', () => {
    test('Correct return type', () => {
      const result = createUpdateBody('rob@gmail.com', 'Rob', 'Robbington');
      const res = request('PUT', `${url}:${port}/v1/admin/user/details`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify(result),
      });
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({});
      expect(res.statusCode).toStrictEqual(200);
    });
  });

  describe('Unauthorised', () => {
    test('invalid userId', () => {
      const result = createUpdateBody('rob@gmail.com', 'Rob', 'Robbington');
      const res = request('PUT', `${url}:${port}/v1/admin/user/details`, {
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

  describe('Invalid Email', () => {
    test('Email in use by another user', () => {
      request('POST', `${url}:${port}/v1/admin/auth/register`, {
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'bob@gmail.com',
          password: 'password123',
          nameFirst: 'Bob',
          nameLast: 'Bobbington'
        })
      });

      const result = createUpdateBody('bob@gmail.com', 'yuchao', 'jiang');
      const res = request('PUT', `${url}:${port}/v1/admin/user/details`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify(result),
      });
      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_EMAIL',
        message: expect.any(String),
      });
    });

    test('Email invalid', () => {
      const result = createUpdateBody('robgmail.com', 'Rob', 'Robbington');
      const res = request('PUT', `${url}:${port}/v1/admin/user/details`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify(result),
      });
      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_EMAIL',
        message: expect.any(String),
      });
    });
  });

  describe('Invalid_first_name', () => {
    test('nameFirst contains invalid characters', () => {
      const result = createUpdateBody('bob@gmail.com', 'Bob!', 'Bobbington');
      const res = request('PUT', `${url}:${port}/v1/admin/user/details`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify(result),
      });
      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_FIRST_NAME',
        message: expect.any(String),
      });
    });

    test('nameFirst too short', () => {
      const result = createUpdateBody('bob@gmail.com', 'B', 'Bobbington');
      const res = request('PUT', `${url}:${port}/v1/admin/user/details`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify(result),
      });
      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_FIRST_NAME',
        message: expect.any(String),
      });
    });

    test('nameFirst too long', () => {
      const result = createUpdateBody('bob@gmail.com', 'BobBobBobBobBobBobBobBob', 'Bobbington');
      const res = request('PUT', `${url}:${port}/v1/admin/user/details`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify(result),
      });
      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_FIRST_NAME',
        message: expect.any(String),
      });
    });
  });

  describe('Invalid_Last_name', () => {
    test('nameLast contains invalid characters', () => {
      const result = createUpdateBody('bob@gmail.com', 'Bob', 'Bobbington!');
      const res = request('PUT', `${url}:${port}/v1/admin/user/details`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify(result),
      });
      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_LAST_NAME',
        message: expect.any(String),
      });
    });

    test('nameLast too short', () => {
      const result = createUpdateBody('bob@gmail.com', 'Bob', 'B');
      const res = request('PUT', `${url}:${port}/v1/admin/user/details`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify(result),
      });
      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_LAST_NAME',
        message: expect.any(String),
      });
    });

    test('nameLast too long', () => {
      const result = createUpdateBody('bob@gmail.com', 'Bob', 'BobbingtonBobbingtonBobbington');
      const res = request('PUT', `${url}:${port}/v1/admin/user/details`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify(result),
      });
      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_LAST_NAME',
        message: expect.any(String),
      });
    });
  });
});
