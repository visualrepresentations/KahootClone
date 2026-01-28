import request from 'sync-request-curl';
import config from '../../../config.json';
const port = config.port;
const url = config.url;

beforeEach(() => {
  request('DELETE', `${url}:${port}/v1/clear`);
  request('POST', `${url}:${port}/v1/admin/auth/register`, {
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

  request('POST', `${url}:${port}/v1/admin/auth/register`, {
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'user1@gmail.com',
      password: 'user12345678',
      nameFirst: 'firstUser',
      nameLast: 'lastUser'
    })
  });
});

describe('adminQuizInfoHTTP', () => {
  test('invalid quiz id - quiz id not exits', () => {
    const res = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'user1@gmail.com',
        password: 'user12345678'
      })
    });

    request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(res.body as string).session,
      },
      body: JSON.stringify({
        name: 'quiz1',
        description: 'description for quiz 1',
      })
    });

    const res3 = request('GET', `${url}:${port}/v1/admin/quiz/${123123}`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(res.body as string).session,
      }
    });

    expect(JSON.parse(res3.body as string)).toStrictEqual({
      error: expect.any(String),
      message: expect.any(String)
    });
    expect(res3.statusCode).toStrictEqual(403);
  });

  test('invalid quiz id - user does not own the quiz', () => {
    const user1 = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'yuchao.jiang@nmsu.edu.au',
        password: 'yuchaojiang123'
      })
    });

    const user2 = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'user1@gmail.com',
        password: 'user12345678'
      })
    });

    const quiz1 = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(user1.body as string).session
      },
      body: JSON.stringify({
        name: 'quiz1',
        description: 'quiz_1_description'
      })
    });

    const res = request('GET', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz1.body as string).quizId}`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(user2.body as string).session
      },
    });

    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: expect.any(String),
      message: expect.any(String)
    });
    expect(res.statusCode).toStrictEqual(403);
  });

  test('invalid session', () => {
    const user1 = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'yuchao.jiang@nmsu.edu.au',
        password: 'yuchaojiang123'
      })
    });

    const quiz1 = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(user1.body as string).session
      },
      body: JSON.stringify({
        name: 'quiz1',
        description: 'quiz_1_description'
      })
    });

    const res = request('GET', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz1.body as string).quizId}`, {
      headers: {
        'Content-Type': 'application/json',
        'session': '123321123456'
      }
    });
    expect(res.statusCode).toStrictEqual(401);
  });

  test('successful', () => {
    const user1 = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'yuchao.jiang@nmsu.edu.au',
        password: 'yuchaojiang123'
      })
    });

    const quiz1 = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(user1.body as string).session
      },
      body: JSON.stringify({
        name: 'quiz1',
        description: 'quiz_1_description'
      })
    });

    const res = request('GET', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz1.body as string).quizId}`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(user1.body as string).session
      }
    });
    expect(res.statusCode).toStrictEqual(200);
  });
});
