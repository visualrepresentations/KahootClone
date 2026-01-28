import request from 'sync-request-curl';
import config from '../../../config.json';

const port = config.port;
const url = config.url;

let session: string;

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

describe('adminQuizCreate', () => {
  describe('Successful creation', () => {
    test('Return 200 and quizId on success', () => {
      const res = request('POST', `${url}:${port}/v1/admin/quiz`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify({
          name: 'Math Quiz',
          description: 'A quiz about mathematics'
        }),
      });

      expect(res.statusCode).toStrictEqual(200);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toHaveProperty('quizId');
      expect(typeof responseBody.quizId).toBe('number');
    });
  });

  describe('Unauthorised', () => {
    test('Invalid session returns 401', () => {
      const res = request('POST', `${url}:${port}/v1/admin/quiz`, {
        headers: {
          'Content-Type': 'application/json',
          'session': 'invalid_session'
        },
        body: JSON.stringify({
          name: 'Science Quiz',
          description: 'A quiz about science'
        }),
      });

      expect(res.statusCode).toStrictEqual(401);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'UNAUTHORISED',
        message: expect.any(String),
      });
    });
  });

  describe('Invalid parameters', () => {
    test('Name with invalid characters returns 400', () => {
      const res = request('POST', `${url}:${port}/v1/admin/quiz`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify({
          name: 'Quiz!@#',
          description: 'Valid description'
        }),
      });

      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_QUIZ_NAME',
        message: expect.any(String),
      });
    });

    test('Name too short (less than 3 characters) returns 400', () => {
      const res = request('POST', `${url}:${port}/v1/admin/quiz`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify({
          name: 'Q1',
          description: 'Valid description'
        }),
      });

      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_QUIZ_NAME',
        message: expect.any(String),
      });
    });

    test('Name too long (more than 30 characters) returns 400', () => {
      const longName = 'a'.repeat(31);
      const res = request('POST', `${url}:${port}/v1/admin/quiz`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify({
          name: longName,
          description: 'Valid description'
        }),
      });

      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_QUIZ_NAME',
        message: expect.any(String),
      });
    });

    test('Duplicate quiz name returns 400', () => {
      request('POST', `${url}:${port}/v1/admin/quiz`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify({
          name: 'Duplicate Quiz',
          description: 'First quiz'
        }),
      });

      const res = request('POST', `${url}:${port}/v1/admin/quiz`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify({
          name: 'Duplicate Quiz',
          description: 'Second quiz'
        }),
      });

      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'DUPLICATE_QUIZ_NAME',
        message: expect.any(String),
      });
    });

    test('Description too long (more than 100 characters) returns 400', () => {
      const longDesc = 'a'.repeat(101);
      const res = request('POST', `${url}:${port}/v1/admin/quiz`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify({
          name: 'Geography Quiz',
          description: longDesc
        }),
      });

      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_DESCRIPTION',
        message: expect.any(String),
      });
    });
  });
});
