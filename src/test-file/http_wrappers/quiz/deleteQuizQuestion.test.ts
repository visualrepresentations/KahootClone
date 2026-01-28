import request from 'sync-request-curl';
import config from '../../../config.json';
import { clear } from '../../../other';
import { Question } from '../../../interfaces';

const SERVER_URL = `${config.url}:${config.port}`;

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

describe('HTTP: DELETE /v1/admin/quiz/:quizid/question/:questionid', () => {
  describe('Successful deletion', () => {
    test('Return 200 on success and remove question', () => {
      const session = registerAndLogin('delete@example.com');
      const quizId = createQuiz(session);
      const questionId = createQuestion(session, quizId);

      const res = request('DELETE', `${SERVER_URL}/v1/admin/quiz/${quizId}/question/${questionId}`, {
        headers: { session },
      });

      expect(res.statusCode).toStrictEqual(200);
      expect(JSON.parse(res.body.toString())).toEqual({});

      const quizRes = request('GET', `${SERVER_URL}/v1/admin/quiz/${quizId}`, {
        headers: { session },
      });
      const quizData = JSON.parse(quizRes.body.toString());
      const questions = quizData.questions || quizData.quiz?.questions || [];
      expect(questions.some((q: Question) => q.questionId === questionId)).toBe(false);
    });
  });

  describe('Unauthorised', () => {
    test('Invalid session returns 401', () => {
      const session = registerAndLogin('unauth@example.com');
      const quizId = createQuiz(session);
      const questionId = createQuestion(session, quizId);

      const res = request('DELETE', `${SERVER_URL}/v1/admin/quiz/${quizId}/question/${questionId}`, {
        headers: { session: 'invalid_session' },
      });

      expect(res.statusCode).toStrictEqual(401);
    });
  });

  describe('Invalid parameters', () => {
    test('Invalid quizId returns 403', () => {
      const session = registerAndLogin('badquiz@example.com');
      createQuiz(session);

      const res = request('DELETE', `${SERVER_URL}/v1/admin/quiz/9999/question/1`, {
        headers: { session },
      });

      expect(res.statusCode).toStrictEqual(403);
    });

    test('Invalid questionId returns 400', () => {
      const session = registerAndLogin('badquestion@example.com');
      const quizId = createQuiz(session);

      const res = request('DELETE', `${SERVER_URL}/v1/admin/quiz/${quizId}/question/9999`, {
        headers: { session },
      });

      expect(res.statusCode).toStrictEqual(400);
    });
  });

  describe('Active game exists', () => {
    test('Returns 400 when trying to delete a question while a game is active', () => {
      const session = registerAndLogin('activegame@example.com');
      const quizId = createQuiz(session);
      const questionId = createQuestion(session, quizId);

      const resStart = request('POST', `${SERVER_URL}/v1/admin/quiz/${quizId}/game/start`, {
        headers: { session },
        json: { autoStartNum: 1 },
      });
      expect(resStart.statusCode).toStrictEqual(200);

      const resDelete = request('DELETE', `${SERVER_URL}/v1/admin/quiz/${quizId}/question/${questionId}`, {
        headers: { session },
      });

      expect(resDelete.statusCode).toStrictEqual(400);

      const body = JSON.parse(resDelete.body.toString());
      expect(body.error).toStrictEqual('ACTIVE_GAME_EXISTS');
    });
  });
});
