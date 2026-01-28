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
      email: 'testing@gmail.com',
      password: 'Ilovecomp1531!',
      nameFirst: 'John',
      nameLast: 'Doe'
    })
  });
  request('POST', `${url}:${port}/v1/admin/auth/register`, {
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'user2@gmail.com',
      password: 'Ialsolovecomp1531!',
      nameFirst: 'George',
      nameLast: 'Smith'
    })
  });
});

describe('adminQuizQuestionCreateHTTP', () => {
  const validQuestionBody = {
    questionBody: {
      question: 'Why was 6 afraid of 7?',
      timeLimit: 30,
      points: 3,
      thumbnailUrl: 'http://example.com/image.jpg',
      answerOptions: [
        { answer: '6 gotta run; sevens got a gun', correct: true },
        { answer: 'Because 7 ate 9', correct: false }
      ]
    }
  };

  test('invalid session', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user2@gmail.com', password: 'Ialsolovecomp1531!' })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({ name: 'New brainrot', description: 'amazing quiz by max' })
    });

    const res = request('POST', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/question`, {
      headers: {
        'Content-Type': 'application/json',
        'session': 'invalid-session'
      },
      body: JSON.stringify(validQuestionBody)
    });

    expect(res.statusCode).toStrictEqual(401);
    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: expect.any(String),
      message: expect.any(String)
    });
  });

  test('invalid quiz id: quiz does not exist', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user2@gmail.com', password: 'Ialsolovecomp1531!' })
    });

    const res = request('POST', `${url}:${port}/v1/admin/quiz/999999/question`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify(validQuestionBody)
    });

    expect(res.statusCode).toStrictEqual(403);
    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: expect.any(String),
      message: expect.any(String)
    });
  });

  test('invalid body: question too short', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user2@gmail.com', password: 'Ialsolovecomp1531!' })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({ name: 'Quiz A', description: 'Desc' })
    });

    const badBody = { questionBody: { ...validQuestionBody.questionBody, question: 'abcd' } };

    const res = request('POST', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/question`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify(badBody)
    });

    expect(res.statusCode).toStrictEqual(400);
    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: expect.any(String),
      message: expect.any(String)
    });
  });

  test('invalid body: question too long', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user2@gmail.com', password: 'Ialsolovecomp1531!' })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({ name: 'MyQuiz', description: 'Desc' })
    });

    const badBody = { questionBody: { ...validQuestionBody.questionBody, question: 'a'.repeat(51) } };

    const res = request('POST', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/question`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify(badBody)
    });

    expect(res.statusCode).toStrictEqual(400);
    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: expect.any(String),
      message: expect.any(String)
    });
  });

  test('invalid body: points too low', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user2@gmail.com', password: 'Ialsolovecomp1531!' })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({ name: 'MyQuiz', description: 'Desc' })
    });

    const badBody = { questionBody: { ...validQuestionBody.questionBody, points: 0 } };

    const res = request('POST', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/question`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify(badBody)
    });

    expect(res.statusCode).toStrictEqual(400);
    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: expect.any(String),
      message: expect.any(String)
    });
  });

  test('invalid body: points too high', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user2@gmail.com', password: 'Ialsolovecomp1531!' })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({ name: 'MyQuiz', description: 'Desc' })
    });

    const badBody = { questionBody: { ...validQuestionBody.questionBody, points: 11 } };

    const res = request('POST', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/question`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify(badBody)
    });

    expect(res.statusCode).toStrictEqual(400);
    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: expect.any(String),
      message: expect.any(String)
    });
  });

  test('invalid body: too few answers', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user2@gmail.com', password: 'Ialsolovecomp1531!' })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({ name: 'MyQuiz', description: 'Desc' })
    });

    const badBody = { questionBody: { ...validQuestionBody.questionBody, answerOptions: [{ answer: 'Only one', correct: true }] } };

    const res = request('POST', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/question`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify(badBody)
    });

    expect(res.statusCode).toStrictEqual(400);
    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: expect.any(String),
      message: expect.any(String)
    });
  });

  test('invalid body: too many answers', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user2@gmail.com', password: 'Ialsolovecomp1531!' })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({ name: 'MyQuiz', description: 'Desc' })
    });

    const badBody = { questionBody: { ...validQuestionBody.questionBody, answerOptions: Array.from({ length: 7 }, (_, i) => ({ answer: `Answer ${i}`, correct: i === 0 })) } };

    const res = request('POST', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/question`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify(badBody)
    });

    expect(res.statusCode).toStrictEqual(400);
    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: expect.any(String),
      message: expect.any(String)
    });
  });

  test('invalid body: answer too short', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user2@gmail.com', password: 'Ialsolovecomp1531!' })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({ name: 'MyQuiz', description: 'Desc' })
    });

    const badBody = { questionBody: { ...validQuestionBody.questionBody, answerOptions: [{ answer: '', correct: true }, { answer: 'Valid answer', correct: false }] } };

    const res = request('POST', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/question`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify(badBody)
    });

    expect(res.statusCode).toStrictEqual(400);
    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: expect.any(String),
      message: expect.any(String)
    });
  });

  test('invalid body: answer too long', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user2@gmail.com', password: 'Ialsolovecomp1531!' })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({ name: 'MyQuiz', description: 'Desc' })
    });

    const badBody = { questionBody: { ...validQuestionBody.questionBody, answerOptions: [{ answer: 'a'.repeat(31), correct: true }, { answer: 'Valid answer', correct: false }] } };

    const res = request('POST', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/question`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify(badBody)
    });

    expect(res.statusCode).toStrictEqual(400);
    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: expect.any(String),
      message: expect.any(String)
    });
  });

  test('invalid body: duplicate answers', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user2@gmail.com', password: 'Ialsolovecomp1531!' })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({ name: 'MyQuiz', description: 'Desc' })
    });

    const badBody = { questionBody: { ...validQuestionBody.questionBody, answerOptions: [{ answer: 'Same answer', correct: true }, { answer: 'Same answer', correct: false }] } };

    const res = request('POST', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/question`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify(badBody)
    });

    expect(res.statusCode).toStrictEqual(400);
    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: expect.any(String),
      message: expect.any(String)
    });
  });

  test('invalid body: no correct answers', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user2@gmail.com', password: 'Ialsolovecomp1531!' })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({ name: 'MyQuiz', description: 'Desc' })
    });

    const badBody = { questionBody: { ...validQuestionBody.questionBody, answerOptions: [{ answer: 'Wrong answer', correct: false }, { answer: 'Another wrong', correct: false }] } };

    const res = request('POST', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/question`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify(badBody)
    });

    expect(res.statusCode).toStrictEqual(400);
    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: expect.any(String),
      message: expect.any(String)
    });
  });

  test('invalid body: time limit zero', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user2@gmail.com', password: 'Ialsolovecomp1531!' })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({ name: 'MyQuiz', description: 'Desc' })
    });

    const badBody = { questionBody: { ...validQuestionBody.questionBody, timeLimit: 0 } };

    const res = request('POST', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/question`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify(badBody)
    });

    expect(res.statusCode).toStrictEqual(400);
    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: expect.any(String),
      message: expect.any(String)
    });
  });

  test('invalid body: time limit negative', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user2@gmail.com', password: 'Ialsolovecomp1531!' })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({ name: 'MyQuiz', description: 'Desc' })
    });

    const badBody = { questionBody: { ...validQuestionBody.questionBody, timeLimit: -1 } };

    const res = request('POST', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/question`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify(badBody)
    });

    expect(res.statusCode).toStrictEqual(400);
    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: expect.any(String),
      message: expect.any(String)
    });
  });

  test('invalid body: total time limit exceeds 3 minutes', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user2@gmail.com', password: 'Ialsolovecomp1531!' })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({ name: 'MyQuiz', description: 'Desc' })
    });

    // single question exceeding 3 minutes
    const badBody = { questionBody: { ...validQuestionBody.questionBody, timeLimit: 181 } };
    const res = request('POST', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/question`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify(badBody)
    });

    expect(res.statusCode).toStrictEqual(400);
    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: expect.any(String),
      message: expect.any(String)
    });
  });

  test('invalid body: thumbnail - empty string', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user2@gmail.com', password: 'Ialsolovecomp1531!' })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({ name: 'MyQuiz', description: 'Desc' })
    });

    const badBody = { questionBody: { ...validQuestionBody.questionBody, thumbnailUrl: '' } };

    const res = request('POST', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/question`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify(badBody)
    });

    expect(res.statusCode).toStrictEqual(400);
    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: expect.any(String),
      message: expect.any(String)
    });
  });

  test('invalid body: thumbnail - wrong file type', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user2@gmail.com', password: 'Ialsolovecomp1531!' })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({ name: 'MyQuiz', description: 'Desc' })
    });

    const badBody = { questionBody: { ...validQuestionBody.questionBody, thumbnailUrl: 'http://example.com/image.pdf' } };

    const res = request('POST', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/question`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify(badBody)
    });

    expect(res.statusCode).toStrictEqual(400);
    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: expect.any(String),
      message: expect.any(String)
    });
  });

  test('invalid body: thumbnail - no http prefix', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user2@gmail.com', password: 'Ialsolovecomp1531!' })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({ name: 'MyQuiz', description: 'Desc' })
    });

    const badBody = { questionBody: { ...validQuestionBody.questionBody, thumbnailUrl: 'example.com/image.jpg' } };

    const res = request('POST', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/question`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify(badBody)
    });

    expect(res.statusCode).toStrictEqual(400);
    expect(JSON.parse(res.body as string)).toStrictEqual({
      error: expect.any(String),
      message: expect.any(String)
    });
  });

  test('successful', () => {
    const owner = request('POST', `${url}:${port}/v1/admin/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user2@gmail.com', password: 'Ialsolovecomp1531!' })
    });

    const quiz = request('POST', `${url}:${port}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify({ name: 'Quiz A', description: 'Desc' })
    });

    const res = request('POST', `${url}:${port}/v1/admin/quiz/${JSON.parse(quiz.body as string).quizId}/question`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(owner.body as string).session
      },
      body: JSON.stringify(validQuestionBody)
    });

    expect(res.statusCode).toStrictEqual(200);
    expect(JSON.parse(res.body as string)).toEqual({ questionId: expect.any(Number) });
  });
});
