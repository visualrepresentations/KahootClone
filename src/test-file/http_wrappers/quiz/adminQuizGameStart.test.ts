import request from 'sync-request-curl';
import config from '../../../config.json';

const port = config.port;
const url = config.url;

beforeEach(() => {
  // Clear all data before each test
  request('DELETE', `${url}:${port}/v1/clear`);

  // Register two users for use in multiple tests
  request('POST', `${url}:${port}/v1/admin/auth/register`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'owner@example.com',
      password: 'Password123',
      nameFirst: 'Owner',
      nameLast: 'User'
    })
  });

  request('POST', `${url}:${port}/v1/admin/auth/register`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'intruder@example.com',
      password: 'Password123',
      nameFirst: 'Intruder',
      nameLast: 'User'
    })
  });
});

describe('adminQuizGameStartHTTP', () => {
  test('401 - invalid or missing session', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'owner@example.com',
        password: 'Password123'
      })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({
        name: 'Math Quiz',
        description: 'Basic arithmetic quiz'
      })
    });

    const res = request('POST', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/game/start`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoStartNum: 3 })
    });

    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: expect.any(String),
      message: expect.any(String)
    });
    expect(res.statusCode).toStrictEqual(401);
  });

  test('403 - valid session but user does not own quiz', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'owner@example.com',
        password: 'Password123'
      })
    });

    const intruder = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'intruder@example.com',
        password: 'Password123'
      })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({
        name: 'Science Quiz',
        description: 'Basic science quiz'
      })
    });

    const res = request('POST', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/game/start`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(intruder.body as string).session
      },
      body: JSON.stringify({ autoStartNum: 3 })
    });

    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: expect.any(String),
      message: expect.any(String)
    });
    expect(res.statusCode).toStrictEqual(403);
  });

  test('400 - autoStartNum greater than 50', () => {
    const user = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'owner@example.com',
        password: 'Password123'
      })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(user.body as string).session
      },
      body: JSON.stringify({
        name: 'History Quiz',
        description: 'Ancient history quiz'
      })
    });

    // Add at least one question
    request('POST', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/question`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(user.body as string).session
      },
      body: JSON.stringify({
        question: 'When was Rome founded?',
        timeLimit: 10,
        points: 5,
        thumbnailUrl: 'http://example.com/image.jpg',
        answerOptions: [
          { answer: '753 BC', correct: true },
          { answer: '476 AD', correct: false }
        ]
      })
    });

    const res = request('POST', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/game/start`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(user.body as string).session
      },
      body: JSON.stringify({ autoStartNum: 51 })
    });

    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: expect.any(String),
      message: expect.any(String)
    });
    expect(res.statusCode).toStrictEqual(400);
  });

  test('400 - quiz has no questions', () => {
    const user = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'owner@example.com',
        password: 'Password123'
      })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(user.body as string).session
      },
      body: JSON.stringify({
        name: 'Empty Quiz',
        description: 'No questions yet'
      })
    });

    const res = request('POST', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/game/start`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(user.body as string).session
      },
      body: JSON.stringify({ autoStartNum: 3 })
    });

    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: expect.any(String),
      message: expect.any(String)
    });
    expect(res.statusCode).toStrictEqual(400);
  });

  test('200 - successfully starts a new game', () => {
    const user = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'owner@example.com',
        password: 'Password123'
      })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(user.body as string).session
      },
      body: JSON.stringify({
        name: 'Geography Quiz',
        description: 'Countries and capitals'
      })
    });

    // Add at least one question
    request('POST', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/question`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(user.body as string).session
      },
      body: JSON.stringify({
        question: 'What is the capital of France?',
        timeLimit: 10,
        points: 5,
        thumbnailUrl: 'http://example.com/image.jpg',
        answerOptions: [
          { answer: 'Paris', correct: true },
          { answer: 'London', correct: false }
        ]
      })
    });

    const res = request('POST', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/game/start`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(user.body as string).session
      },
      body: JSON.stringify({ autoStartNum: 3 })
    });

    expect(res.statusCode).toStrictEqual(200);
    const body = JSON.parse(res.body as string);
    expect(body).toStrictEqual({
      gameId: expect.any(Number)
    });
  });
});
