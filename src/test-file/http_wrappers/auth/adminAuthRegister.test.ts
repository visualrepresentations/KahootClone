import request from 'sync-request-curl';
import config from '../../../config.json';
const port = config.port;
const url = config.url;

// Helper function to be able to easily convert the function testing code to the jsonified body
function createRegisterBody(email: string, password: string, nameFirst: string, nameLast: string) {
  return {
    email: email,
    password: password,
    nameFirst: nameFirst,
    nameLast: nameLast,
  };
}

beforeEach(() => {
  request('DELETE', `${url}:${port}/v1/clear`);
});

describe('adminAuthRegisterHTTP', () => {
  describe('Successful Registration', () => {
    test('Returns valid userId', () => {
      const requestBody = {
        email: 'yuchao.jiang@nmsu.edu.au',
        password: 'yuchaojiang123',
        nameFirst: 'yuchao',
        nameLast: 'jiang'
      };
      const res = request('POST', `${url}:${port}/v1/admin/auth/register`, {
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      expect(res.statusCode).toStrictEqual(200);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        session: expect.any(String),
      });
    });
  });

  describe('Invalid Email', () => {
    test('Empty email', () => {
      const result = createRegisterBody('', 'password123', 'Bob', 'Bobbington');
      const res = request('POST', `${url}:${port}/v1/admin/auth/register`, {
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(result)
      });
      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_EMAIL',
        message: expect.any(String),
      });
    });

    test('Email in use by another user', () => {
      const firstUser = createRegisterBody('bob@gmail.com', 'password123', 'Bob', 'Bobbington');
      request('POST', `${url}:${port}/v1/admin/auth/register`, {
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(firstUser)
      });

      const result = createRegisterBody('bob@gmail.com', 'password123', 'Rob', 'Robbington');
      const res = request('POST', `${url}:${port}/v1/admin/auth/register`, {
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(result)
      });
      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_EMAIL',
        message: expect.any(String),
      });
    });
  });

  describe('Invalid First Name', () => {
    test('nameFirst contains invalid characters', () => {
      const result = createRegisterBody('bob@gmail.com', 'password123', 'Bob!', 'Bobbington');
      const res = request('POST', `${url}:${port}/v1/admin/auth/register`, {
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(result)
      });
      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_FIRST_NAME',
        message: expect.any(String),
      });
    });

    test('nameFirst too short', () => {
      const result = createRegisterBody('bob@gmail.com', 'password123', 'B', 'Bobbington');
      const res = request('POST', `${url}:${port}/v1/admin/auth/register`, {
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(result)
      });
      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_FIRST_NAME',
        message: expect.any(String),
      });
    });

    test('nameFirst too long', () => {
      const result = createRegisterBody('bob@gmail.com', 'password123', 'BobBobBobBobBobBobBobBob', 'Bobbington');
      const res = request('POST', `${url}:${port}/v1/admin/auth/register`, {
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(result)
      });
      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_FIRST_NAME',
        message: expect.any(String),
      });
    });
  });

  describe('Invalid Last Name', () => {
    test('nameLast contains invalid characters', () => {
      const result = createRegisterBody('bob@gmail.com', 'password123', 'Bob', 'Bobbington!');
      const res = request('POST', `${url}:${port}/v1/admin/auth/register`, {
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(result)
      });
      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_LAST_NAME',
        message: expect.any(String),
      });
    });

    test('nameLast too short', () => {
      const result = createRegisterBody('bob@gmail.com', 'password123', 'Bob', 'B');
      const res = request('POST', `${url}:${port}/v1/admin/auth/register`, {
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(result)
      });
      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_LAST_NAME',
        message: expect.any(String),
      });
    });

    test('nameLast too long', () => {
      const result = createRegisterBody('bob@gmail.com', 'password123', 'Bob', 'BobbingtonBobbingtonBobbington');
      const res = request('POST', `${url}:${port}/v1/admin/auth/register`, {
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(result)
      });
      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_LAST_NAME',
        message: expect.any(String),
      });
    });
  });

  describe('Invalid Password', () => {
    test('New password too short', () => {
      const result = createRegisterBody('bob@gmail.com', 'pass1', 'Bob', 'Bobbington');
      const res = request('POST', `${url}:${port}/v1/admin/auth/register`, {
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(result)
      });
      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_PASSWORD',
        message: expect.any(String),
      });
    });

    test('New password does not contain number', () => {
      const result = createRegisterBody('bob@gmail.com', 'passwordpassword', 'Bob', 'Bobbington');
      const res = request('POST', `${url}:${port}/v1/admin/auth/register`, {
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(result)
      });
      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_PASSWORD',
        message: expect.any(String),
      });
    });

    test('New password does not contain letter', () => {
      const result = createRegisterBody('bob@gmail.com', '1234567890', 'Bob', 'Bobbington');
      const res = request('POST', `${url}:${port}/v1/admin/auth/register`, {
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(result)
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
