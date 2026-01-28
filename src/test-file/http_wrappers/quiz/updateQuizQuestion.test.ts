import request from 'sync-request-curl';
import config from '../../../config.json';
import { clear } from '../../../other';

const SERVER_URL = `${config.url}:${config.port}`;

interface Answer {
  answerId?: number;
  colour?: string;
  answer: string;
  correct: boolean;
}

interface Question {
  questionId: number;
  question: string;
  timeLimit: number;
  points: number;
  answerOptions: Answer[];
  thumbnailUrl: string;
}

function registerAndLogin(email: string): string {
  request('POST', `${SERVER_URL}/v1/admin/auth/register`, {
    json: { email, password: 'password123', nameFirst: 'John', nameLast: 'Doe' },
  });
  const login = request('POST', `${SERVER_URL}/v1/admin/auth/login`, {
    json: { email, password: 'password123' },
  });
  return JSON.parse(login.body.toString()).session as string;
}

function createQuiz(session: string, name = 'Test Quiz'): number {
  const res = request('POST', `${SERVER_URL}/v1/admin/quiz`, {
    headers: { session },
    json: { name, description: 'Test Description' },
  });
  return JSON.parse(res.body.toString()).quizId as number;
}

function createQuestion(session: string, quizId: number): number {
  const res = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/question`, {
    headers: { session },
    json: {
      questionBody: {
        question: 'Who is the Monarch of England?',
        timeLimit: 10,
        points: 5,
        answerOptions: [
          { answer: 'King Charles', correct: true },
          { answer: 'Queen Elizabeth', correct: false },
        ],
        thumbnailUrl: 'http://example.com/image.jpg',
      },
    },
  });
  return JSON.parse(res.body.toString()).questionId as number;
}

beforeEach(() => clear());

describe('HTTP: PUT /v1/admin/quiz/:quizid/question/:questionid', () => {
  describe('Successful Updates', () => {
    test('Successfully updates a quiz question and persists changes (200 OK)', () => {
      const session = registerAndLogin('update@example.com');
      const quizId = createQuiz(session);
      const questionId = createQuestion(session, quizId);

      const updateRes = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/question/${questionId}`, {
        headers: { session },
        json: {
          questionBody: {
            question: 'What colour is the sky?',
            timeLimit: 8,
            points: 7,
            answerOptions: [
              { answer: 'Blue', correct: true },
              { answer: 'Red', correct: false },
            ],
            thumbnailUrl: 'https://example.com/sky.png',
          },
        },
      });

      expect(updateRes.statusCode).toBe(200);
      expect(JSON.parse(updateRes.body.toString())).toStrictEqual({});

      const infoRes = request('GET', `${SERVER_URL}/v1/admin/quiz/${quizId}`, { headers: { session } });
      expect(infoRes.statusCode).toBe(200);

      const quizData = JSON.parse(infoRes.body.toString());
      const updatedQuestion: Question
        = quizData.questions?.find((q: Question) => q.questionId === questionId)
          ?? quizData.quiz?.questions?.find((q: Question) => q.questionId === questionId);

      expect(updatedQuestion.question).toBe('What colour is the sky?');
      expect(updatedQuestion.points).toBe(7);
      expect(updatedQuestion.timeLimit).toBe(8);
      expect(updatedQuestion.answerOptions.length).toBe(2);
      expect(updatedQuestion.answerOptions[0]).toHaveProperty('colour');
    });
  });

  describe('Authorisation and Ownership Errors', () => {
    test('401 UNAUTHORISED – invalid or missing session', () => {
      const session = registerAndLogin('unauth@example.com');
      const quizId = createQuiz(session);
      const questionId = createQuestion(session, quizId);

      const res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/question/${questionId}`, {
        headers: { session: 'invalid-session' },
        json: {
          questionBody: {
            question: 'Invalid session test',
            timeLimit: 5,
            points: 5,
            answerOptions: [
              { answer: 'Yes', correct: true },
              { answer: 'No', correct: false },
            ],
            thumbnailUrl: 'http://example.com/image.jpg',
          },
        },
      });

      expect(res.statusCode).toBe(401);
    });

    test('403 FORBIDDEN – user does not own quiz', () => {
      const ownerSession = registerAndLogin('owner@example.com');
      const quizId = createQuiz(ownerSession);
      const questionId = createQuestion(ownerSession, quizId);
      const otherSession = registerAndLogin('other@example.com');

      const res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/question/${questionId}`, {
        headers: { session: otherSession },
        json: {
          questionBody: {
            question: 'Unauthorized update',
            timeLimit: 10,
            points: 5,
            answerOptions: [
              { answer: 'A', correct: true },
              { answer: 'B', correct: false },
            ],
            thumbnailUrl: 'http://example.com/image.png',
          },
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('Input Validation Errors', () => {
    test('400 INVALID_QUESTION – question text too short', () => {
      const session = registerAndLogin('short@example.com');
      const quizId = createQuiz(session);
      const questionId = createQuestion(session, quizId);

      const res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/question/${questionId}`, {
        headers: { session },
        json: {
          questionBody: {
            question: 'Hi',
            timeLimit: 10,
            points: 5,
            answerOptions: [
              { answer: 'Yes', correct: true },
              { answer: 'No', correct: false },
            ],
            thumbnailUrl: 'http://example.com/image.jpg',
          },
        },
      });

      expect(res.statusCode).toBe(400);
    });

    test('400 INVALID_ANSWERS – duplicate answers', () => {
      const session = registerAndLogin('dup@example.com');
      const quizId = createQuiz(session);
      const questionId = createQuestion(session, quizId);

      const res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/question/${questionId}`, {
        headers: { session },
        json: {
          questionBody: {
            question: 'Duplicate answers',
            timeLimit: 10,
            points: 5,
            answerOptions: [
              { answer: 'Same', correct: true },
              { answer: 'Same', correct: false },
            ],
            thumbnailUrl: 'http://example.com/image.jpg',
          },
        },
      });

      expect(res.statusCode).toBe(400);
    });

    test('400 INVALID_POINTS – points out of range', () => {
      const session = registerAndLogin('points@example.com');
      const quizId = createQuiz(session);
      const questionId = createQuestion(session, quizId);

      const res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/question/${questionId}`, {
        headers: { session },
        json: {
          questionBody: {
            question: 'Points check',
            timeLimit: 10,
            points: 15,
            answerOptions: [
              { answer: 'A', correct: true },
              { answer: 'B', correct: false },
            ],
            thumbnailUrl: 'http://example.com/image.jpg',
          },
        },
      });

      expect(res.statusCode).toBe(400);
    });

    test('400 INVALID_TIMELIMIT – exceeds 180s total', () => {
      const session = registerAndLogin('time@example.com');
      const quizId = createQuiz(session);
      const questionId = createQuestion(session, quizId);

      const res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/question/${questionId}`, {
        headers: { session },
        json: {
          questionBody: {
            question: 'Too long quiz time',
            timeLimit: 500,
            points: 5,
            answerOptions: [
              { answer: 'One', correct: true },
              { answer: 'Two', correct: false },
            ],
            thumbnailUrl: 'http://example.com/image.jpg',
          },
        },
      });

      expect(res.statusCode).toBe(400);
    });

    test('400 INVALID_THUMBNAIL – invalid URL', () => {
      const session = registerAndLogin('thumb@example.com');
      const quizId = createQuiz(session);
      const questionId = createQuestion(session, quizId);

      const res = request('PUT', `${SERVER_URL}/v1/admin/quiz/${quizId}/question/${questionId}`, {
        headers: { session },
        json: {
          questionBody: {
            question: 'Bad thumbnail',
            timeLimit: 10,
            points: 5,
            answerOptions: [
              { answer: 'A', correct: true },
              { answer: 'B', correct: false },
            ],
            thumbnailUrl: 'ftp://example.com/notallowed.gif',
          },
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });
});
