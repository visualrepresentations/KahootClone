import request from 'sync-request-curl';
import config from '../../../config.json';
const server = `${config.url}:${config.port}`;

beforeEach(() => {
  request('DELETE', `${server}/v1/clear`);
});

describe('HTTP: adminQuizGuestJoinGame', () => {
  test('Invalid player name', () => {
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

    const res1 = request('POST', `${server}/v1/player/join`, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        gameId: JSON.parse(game1.body as string).gameId,
        playerName: 'HELLO@'
      }),
    });
    expect(res1.statusCode).toStrictEqual(400);

    request('POST', `${server}/v1/player/join`, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        gameId: JSON.parse(game1.body as string).gameId,
        playerName: 'player1'
      }),
    });

    const res2 = request('POST', `${server}/v1/player/join`, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        gameId: JSON.parse(game1.body as string).gameId,
        playerName: 'player1'
      }),
    });

    expect(res2.statusCode).toStrictEqual(400);
  });

  test('Invalid game id', () => {
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

    const res1 = request('POST', `${server}/v1/player/join`, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        gameId: JSON.parse(game1.body as string).gameId + 1,
        playerName: 'HELLO@'
      }),
    });

    expect(res1.statusCode).toStrictEqual(400);
  });

  test('Game not in LOBBY state', () => {
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

    for (let i = 0; i < 5; i++) {
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
    }

    const game1 = request('POST', `${server}/v1/admin/quiz/${JSON.parse(quiz1.body as string).quizId}/game/start`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(user1.body as string).session
      },
      body: JSON.stringify({
        autoStartNum: 1
      })
    });

    const update = request('PUT', `${server}/v1/admin/quiz/${JSON.parse(quiz1.body as string).quizId}/game/${JSON.parse(game1.body as string).gameId}`, {
      headers: {
        'Content-Type': 'application/json',
        'session': JSON.parse(user1.body as string).session
      },
      body: JSON.stringify({
        action: 'NEXT_QUESTION'
      })
    });

    const res1 = request('POST', `${server}/v1/player/join`, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        gameId: JSON.parse(game1.body as string).gameId,
        playerName: ''
      }),
    });

    expect(update.statusCode).toStrictEqual(200);
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

    const res1 = request('POST', `${server}/v1/player/join`, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        gameId: JSON.parse(game1.body as string).gameId,
        playerName: ''
      }),
    });

    expect(res1.statusCode).toStrictEqual(200);
  });
});
