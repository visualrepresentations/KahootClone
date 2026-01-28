import request from 'sync-request-curl';
import config from '../../../config.json';

const server = config.url + ':' + config.port;

beforeEach(() => {
  request('DELETE', `${server}/v1/clear`);
});

describe('HTTP: /v1/player/:playerid', () => {
  test('Player does not exist', () => {
    const res1 = request('GET', `${server}/v1/player/999`);
    expect(res1.statusCode).toStrictEqual(400);
  });

  test('Successful', () => {
    request('POST', `${server}/v1/admin/auth/register`, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'yuchao.jiang@unsw.edu.au',
        password: 'yuchaojiang123',
        nameFirst: 'Yuchao',
        nameLast: 'Jiang'
      }),
    });

    const user1 = request('POST', `${server}/v1/admin/auth/login`, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'yuchao.jiang@unsw.edu.au',
        password: 'yuchaojiang123'
      }),
    });

    const quiz1 = request('POST', `${server}/v1/admin/quiz`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(user1.body as string).session,
      },
      body: JSON.stringify({
        name: 'quiz1',
        description: 'quiz1 description'
      }),
    });

    request('POST', `${server}/v1/admin/quiz/${JSON.parse(quiz1.body as string).quizId}/question`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(user1.body as string).session,
      },
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

    const game1 = request('POST', `${server}/v1/admin/quiz/${JSON.parse(quiz1.body as string).quizId}/game/start`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(user1.body as string).session
      },
      body: JSON.stringify({
        autoStartNum: 1
      })
    });

    const player1 = request('POST', `${server}/v1/player/join`, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        gameId: JSON.parse(game1.body as string).gameId,
        playerName: ''
      }),
    });

    const player2 = request('POST', `${server}/v1/player/join`, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        gameId: JSON.parse(game1.body as string).gameId,
        playerName: ''
      }),
    });

    const res = request('GET', `${server}/v1/player/${JSON.parse(player1.body as string).playerId}`);
    expect(res.statusCode).toStrictEqual(200);
    expect(JSON.parse(res.body as string)).toMatchObject({
      state: expect.any(String),
      numQuestions: expect.any(Number),
      atQuestion: expect.any(Number)
    });

    const res2 = request('GET', `${server}/v1/player/${JSON.parse(player2.body as string).playerId}`);
    expect(res2.statusCode).toStrictEqual(200);
    expect(JSON.parse(res2.body as string)).toMatchObject({
      state: expect.any(String),
      numQuestions: expect.any(Number),
      atQuestion: expect.any(Number)
    });
  });
});
