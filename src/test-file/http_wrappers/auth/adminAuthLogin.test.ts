import request from 'sync-request-curl';
import config from '../../../config.json';
import { json } from 'stream/consumers';

const port = config.port;
const url = config.url;

// build the login request body
function createLoginBody(email: string, password: string) {
  return {
    email: email,
    password: password,
  };
}

beforeEach(() => {
  request('DELETE', `${url}:${port}/v1/clear`);
});

describe('adminAuthLoginHTTP', () => {
  describe('Successful Login', () => {
    test('Returns session', () => {
      // register a user
      const registerBody = {
        email: 'user1@protonmail.com',
        password: 'Password123!',
        nameFirst: 'User',
        nameLast: 'One'
      };
      request('POST', `${url}:${port}/v1/admin/auth/register`, {
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registerBody)
      });

      // log in with the same credentials
      const loginBody = createLoginBody('user1@protonmail.com', 'Password123!');
      const res = request('POST', `${url}:${port}/v1/admin/auth/login`, {
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginBody)
      });
      expect(res.statusCode).toStrictEqual(200);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        session: expect.any(String),
      });
    });
  });

  describe('Invalid Credentials', () => {
    test('Email does not exist', () => {
      const loginBody = createLoginBody('user2@protonmail.com', 'Password1235!');
      const res = request('POST', `${url}:${port}/v1/admin/auth/login`, {
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginBody)
      });
      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_CREDENTIALS',
        message: expect.any(String),
      });
    });

    test('Password incorrect for given email', () => {
      // register valid user
      const registerBody = {
        email: 'user2@protonmail.com',
        password: 'Password123!',
        nameFirst: 'Bob',
        nameLast: 'Droyd'
      };
      request('POST', `${url}:${port}/v1/admin/auth/register`, {
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registerBody)
      });

      // try login with wrong password
      const badLoginBody = createLoginBody('user2@protonmail.com', 'Wrongpass123!');
      const res = request('POST', `${url}:${port}/v1/admin/auth/login`, {
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(badLoginBody)
      });
      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_CREDENTIALS',
        message: expect.any(String),
      });
    });
  });
});
