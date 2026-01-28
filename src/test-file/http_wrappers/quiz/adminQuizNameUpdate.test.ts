import request from 'sync-request-curl';
import config from '../../../config.json';

const port = config.port;
const url = config.url;

beforeEach(() => {
  request('DELETE', `${url}:${port}/v1/clear`);
  request('POST', `${url}:${port}/v1/admin/auth/register`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'testing@gmail.com',
      password: 'Ilovecomp1531!',
      nameFirst: 'John',
      nameLast: 'Doe'
    })
  });
  request('POST', `${url}:${port}/v1/admin/auth/register`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user2@gmail.com',
      password: 'Ialsolovecomp1531!',
      nameFirst: 'George',
      nameLast: 'Smith'
    })
  });
});

describe('adminQuizNameUpdateHTTP', () => {
  test('invalid session', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testing@gmail.com', password: 'Ilovecomp1531!' })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({ name: 'Quiz1', description: 'A fun quiz' })
    });

    const quizId = JSON.parse(quiz.body as string).quizId;

    const res = request('PUT', `${url}:${port}/v1/admin/quiz/${quizId}/name`, {
      headers: {
        'Content-Type': 'application/json',
        'session': 'invalid-session'
      },
      body: JSON.stringify({ name: 'New Name' })
    });

    expect(res.statusCode).toStrictEqual(401);
    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: 'UNAUTHORISED',
      message: expect.any(String)
    });
  });

  test('invalid quiz id: quiz does not exist', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testing@gmail.com', password: 'Ilovecomp1531!' })
    });

    const res = request('PUT', `${url}:${port}/v1/admin/quiz/999999/name`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({ name: 'New Name' })
    });

    expect(res.statusCode).toStrictEqual(403);
    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: 'INVALID_QUIZ_ID',
      message: expect.any(String)
    });
  });

  test('invalid name: too short', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testing@gmail.com', password: 'Ilovecomp1531!' })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({ name: 'the best quiz', description: 'A banger quiz' })
    });

    const res = request('PUT', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/name`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({ name: 'ab' })
    });

    expect(res.statusCode).toStrictEqual(400);
    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: 'INVALID_QUIZ_NAME',
      message: expect.any(String)
    });
  });

  test('invalid name: too long', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testing@gmail.com', password: 'Ilovecomp1531!' })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({ name: 'Valid Name', description: 'Cool quiz' })
    });

    const res = request('PUT', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/name`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({ name: 'a'.repeat(31) })
    });

    expect(res.statusCode).toStrictEqual(400);
    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: 'INVALID_QUIZ_NAME',
      message: expect.any(String)
    });
  });

  test('invalid name: invalid characters', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testing@gmail.com', password: 'Ilovecomp1531!' })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({ name: 'Valid Name', description: 'Cool quiz' })
    });

    const res = request('PUT', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/name`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({ name: 'Invalid@Name!' })
    });
    expect(res.statusCode).toStrictEqual(400);
    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: 'INVALID_QUIZ_NAME',
      message: expect.any(String)
    });
  });

  test('invalid ownership: user tries to rename another user’s quiz', () => {
    const owner1 = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testing@gmail.com', password: 'Ilovecomp1531!' })
    });

    const owner2 = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user2@gmail.com', password: 'Ialsolovecomp1531!' })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner1.body as string).session
      },
      body: JSON.stringify({ name: 'Owner1 Quiz', description: 'Desc' })
    });

    const res = request('PUT', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/name`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner2.body as string).session
      },
      body: JSON.stringify({ name: 'Hacked Name' })
    });

    expect(res.statusCode).toStrictEqual(403);
    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: 'INVALID_QUIZ_ID',
      message: expect.any(String)
    });
  });

  test('duplicate name: user already has another quiz with same name', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testing@gmail.com', password: 'Ilovecomp1531!' })
    });

    const session = JSON.parse(owner.body as string).session;

    request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: { 'Content-Type': 'application/json', 'session': session },
      body: JSON.stringify({ name: 'Quiz A', description: 'Desc A' })
    });

    const quiz2 = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: { 'Content-Type': 'application/json', 'session': session },
      body: JSON.stringify({ name: 'Quiz B', description: 'Desc B' })
    });

    const res = request('PUT', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz2.body as string).quizId}/name`, {
      headers: { 'Content-Type': 'application/json', 'session': session },
      body: JSON.stringify({ name: 'Quiz A' })
    });

    expect(res.statusCode).toStrictEqual(400);
    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: 'DUPLICATE_QUIZ_NAME',
      message: expect.any(String)
    });
  });

  test('successful rename', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testing@gmail.com', password: 'Ilovecomp1531!' })
    });

    const session = JSON.parse(owner.body as string).session;

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: { 'Content-Type': 'application/json', 'session': session },
      body: JSON.stringify({ name: 'Old Name', description: 'Desc' })
    });

    const res = request('PUT', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/name`, {
      headers: { 'Content-Type': 'application/json', 'session': session },
      body: JSON.stringify({ name: 'New Valid Name' })
    });

    expect(res.statusCode).toStrictEqual(200);
    expect(JSON.parse(res.body as string)).toStrictEqual({});
  });
});
