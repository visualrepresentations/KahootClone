import request from 'sync-request-curl';
import config from '../../../config.json';

const port = config.port;
const url = config.url;

let session: string;
let quizId: number;

function createUpdateBody(description: string) {
  return {
    description: description,
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

  const createQuizRes = request('POST', `${url}:${port}/v1/admin/quiz`, {
    headers: {
      'Content-Type': 'application/json',
      'session': session
    },
    body: JSON.stringify({
      name: 'Test Quiz',
      description: 'Original description'
    })
  });
  const createResponseBody = JSON.parse(createQuizRes.body.toString());
  quizId = createResponseBody.quizId;
});

describe('adminQuizDescriptionUpdate', () => {
  describe('Successful update', () => {
    test('Return 200 and empty object on success', () => {
      const res = request('PUT', `${url}:${port}/v1/admin/quiz/${quizId}/description`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify(createUpdateBody('Updated quiz description')),
      });

      expect(res.statusCode).toStrictEqual(200);
      expect(JSON.parse(res.body.toString())).toStrictEqual({});
    });
  });

  describe('Unauthorised', () => {
    test('Invalid session returns 401', () => {
      const res = request('PUT', `${url}:${port}/v1/admin/quiz/${quizId}/description`, {
        headers: {
          'Content-Type': 'application/json',
          'session': 'invalid_session'
        },
        body: JSON.stringify(createUpdateBody('New description')),
      });

      expect(res.statusCode).toStrictEqual(401);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'UNAUTHORISED',
        message: expect.any(String),
      });
    });
  });

  describe('Invalid description', () => {
    test('Too long description returns 400', () => {
      const longDesc = 'a'.repeat(1001);
      const res = request('PUT', `${url}:${port}/v1/admin/quiz/${quizId}/description`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify(createUpdateBody(longDesc)),
      });

      expect(res.statusCode).toStrictEqual(400);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_DESCRIPTION',
        message: expect.any(String),
      });
    });
  });

  describe('Invalid quizId', () => {
    test('Non-existent quizId returns 403', () => {
      const invalidQuizId = 99999;
      const res = request('PUT', `${url}:${port}/v1/admin/quiz/${invalidQuizId}/description`, {
        headers: {
          'Content-Type': 'application/json',
          'session': session
        },
        body: JSON.stringify(createUpdateBody('New description')),
      });

      expect(res.statusCode).toStrictEqual(403);
      const responseBody = JSON.parse(res.body.toString());
      expect(responseBody).toStrictEqual({
        error: 'INVALID_QUIZ_ID',
        message: expect.any(String),
      });
    });
  });
});
