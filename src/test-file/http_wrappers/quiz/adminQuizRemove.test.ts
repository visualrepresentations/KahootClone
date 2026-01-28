import request from 'sync-request-curl';
import config from '../../../config.json';
const port = config.port;
const url = config.url;

beforeEach(() => {
  request('DELETE', `${url}:${port}/v1/clear`);

  // register some users
  request('POST', `${url}:${port}/v1/admin/auth/register`, {
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'user1@gmail.com',
      password: 'user1password',
      nameFirst: 'firstUser',
      nameLast: 'lastUser'
    })
  });

  request('POST', `${url}:${port}/v1/admin/auth/register`, {
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'user2@gmail.com',
      password: 'user2password',
      nameFirst: 'firstUser',
      nameLast: 'lastUser'
    })
  });

  request('POST', `${url}:${port}/v1/admin/auth/register`, {
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'user3@gmail.com',
      password: 'user3password',
      nameFirst: 'firstUser',
      nameLast: 'lastUser'
    })
  });

  // console.log(JSON.parse(user2.body as string));
});

describe('adminQuizRemoveHTTP', () => {
  test('invalid session', () => {
    const user1 = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'user1@gmail.com',
        password: 'user1password',
      })
    });

    request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'user2@gmail.com',
        password: 'user2password',
      })
    });

    const quiz1 = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(user1.body as string).session
      },
      body: JSON.stringify({
        name: 'quiz1 name',
        description: 'quiz1 description'
      })
    });

    const res = request('DELETE', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz1.body as string).quizId}`, {
      headers: {
        'Content-Type': 'application/json',
        'session': '123123'
      }
    });

    expect(res.statusCode).toStrictEqual(401);

    request('POST', `${url}:${port}/v1/admin/auth/logout`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(user1.body as string).session
      }
    });

    const res3 = request('DELETE', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz1.body as string).quizId}`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(user1.body as string).session
      }
    });

    expect(res3.statusCode).toStrictEqual(401);
  });

  test('invalid quiz id', () => {
    const user1 = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'user1@gmail.com',
        password: 'user1password',
      })
    });

    const user2 = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'user2@gmail.com',
        password: 'user2password',
      })
    });

    const quiz1 = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(user1.body as string).session
      },
      body: JSON.stringify({
        name: 'quiz1 name',
        description: 'quiz1 description'
      })
    });

    const res = request('DELETE', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz1.body as string).quizId}`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(user2.body as string).session
      }
    });
    // console.log(JSON.parse(user2.body as string));
    expect(res.statusCode).toStrictEqual(403);

    const res2 = request('DELETE', `${url}:${port}/v1/admin/quiz/${123123}`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(user1.body as string).session
      }
    });

    expect(res2.statusCode).toStrictEqual(403);
  });

  test('delete successful', () => {
    const user1 = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'user1@gmail.com',
        password: 'user1password',
      })
    });

    request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'user2@gmail.com',
        password: 'user2password',
      })
    });

    const quiz1 = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(user1.body as string).session
      },
      body: JSON.stringify({
        name: 'quiz1 name',
        description: 'quiz1 description'
      })
    });

    const res = request('DELETE', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz1.body as string).quizId}`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(user1.body as string).session
      }
    });
    // console.log(JSON.parse(res.body as string));

    expect(res.statusCode).toStrictEqual(200);
  });
});
