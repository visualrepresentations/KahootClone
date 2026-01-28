import express, { json, Request, Response } from 'express';
import { echo } from './newecho';
import morgan from 'morgan';
import config from './config.json';
import cors from 'cors';
import YAML from 'yaml';
import sui from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { adminAuthLogin, adminUserDetails, adminAuthRegister, adminUserDetailsUpdate, adminUserPasswordUpdate, adminQuizStar } from './auth';
import { adminQuizCreate, adminQuizInfo, adminQuizList, adminQuizRemove, updateThumbnail, adminQuizNameUpdate, adminQuizDescriptionUpdate, deleteQuizQuestion, adminQuizQuestionCreate, updateQuizQuestion, adminQuizGames, adminQuizGameStart, adminQuizGameStateUpdate, adminQuizGetPlayerStatusInGame, adminQuizGuestJoinGame, adminGetQuizGameStatus, playerQuestionAnswer, getPlayerQuestionInfo, adminGetQuizGameResults, getPlayerQuestionResults, getPlayerFinalResults } from './quiz';
import { clear } from './other.js';
import { findSession, generateSession, removeSession, validateUserId } from './helper';
import { ToohakError } from './toohakError';
import { saveData, loadData, getData } from './dataStore';
import { error } from 'console';

interface SuccessResponse {
  [key: string]: unknown;
}

interface Session {
  sessionId: string;
  userId: number;
  createdAt: number;
  lastAccessed: number;
}

// Set up web app
const app = express();

// Use middleware that allows us to access the JSON body of requests
app.use(json());
// Use middleware that allows for access from other domains
app.use(cors());
// for logging errors (print to terminal)
app.use(morgan('dev'));

// for producing the docs that define the API
const file = fs.readFileSync(path.join(process.cwd(), 'swagger.yaml'), 'utf8');
app.get('/', (req: Request, res: Response) => res.redirect('/docs'));
app.use(
  '/docs',
  sui.serve,
  sui.setup(YAML.parse(file),
    { swaggerOptions: { docExpansion: config.expandDocs ? 'full' : 'list' } }
  ));

const PORT: number = parseInt(process.env.PORT || config.port);
const HOST: string = process.env.IP || '127.0.0.1';

// ====================================================================
//  ================= WORK IS DONE BELOW THIS LINE ===================
// ====================================================================

function quizCreate(userId: number, name: string, description: string) : {} {
  const data = getData();
  const user = data.users.find(a => a.userId === userId);
  if (!user) {
    throw new Error("Unknown User");
  }

  if (!user.admin) {
    throw new Error("Invalid User");
  }

  if (name.trim() === '' || typeof name !== 'string') {
    throw new Error("Invalid Name")
  }

  if (description.trim() === '' || typeof description !== 'string') {
    throw new Error("Invalid Description");
  }

  data.quizzes.push({
    creatorId: userId,
    quizId: quizzes.length,
    name: name,
    description: description,
  });

  return {};
}

app.post('/v1/admin/quiz/create', (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const sessionId = req.header('Authorization');
    const session = findSession(sessionId as string);
    if (!session) {
      return res.status(401).json({error: 'Invalid Session', message: 'session is missing or invalid'});
    }
    const result = quizCreate(session.userId, name, description);
    return res.status(200).json({});

  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'Invalid User') {
        return res.status(403).json({error: 'Invalid User', message: 'session is valid but the user is not an admin'});
      }
      if (e.message === 'Invalid Name') {
        return res.status(400).json({error: 'Invalid Name', message: 'name is an empty string'});
      }
      if (e.message === 'Invalid Description') {
        return res.status(400).json({
          error: 'Invalid Description', 
          message: 'Description is an empty string'
        });
      }
    }

    throw new Error("Unknown Error");
  }
})

// tests
const url = config.url;
const port = config.port;

beforeEach(() => {
  request('DELETE', `${url}:${port}/v1/quiz/attempt`);
}); 

// 5 tests required
/**
 * no session
 * quiz can't be found
 * quiz creatorid isn't user
 * score is invalid
 * happy path
 */
describe('Quiz Attempt', () => {
  describe('401 Unauthorised', () => {
    test('Session is missing or invalid', () => {
      const session = request('POST', `${url}:${port}/v1/register/user`, {
        json: {
          email: 'jason@gmail.com',
          nameFirst: 'Jason',
          nameLast: 'Jack',
          password: 'jackjason',
        },
      });
      const quizId = request('POST', `${url}:${port}/v1/quiz/create`, {
        json: {
          header: session,
          json: { userId: session.userId, title: 'my quiz' }
        }
      });
      const res = request('POST', `${url}:${port}/v1/quiz/attempt`, {
        json: {userId: session.userId, quizId: quizId, score: 1}
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body.toString());
      expect(body.error).toBe('401 UNAUTHORISED');
    });
  });
  describe('403 Forbidden', () => {
    test('Quiz does not belong to the logged-in user', () => {
      const session = request('POST', `${url}:${port}/v1/register/user`, {
        json: {
          email: 'jason@gmail.com',
          nameFirst: 'Jason',
          nameLast: 'Jack',
          password: 'jackjason',
        },
      });
      const session2 = request('POST', `${url}:${port}/v1/register/user`, {
        json: {
          email: 'jason2@gmail.com',
          nameFirst: 'Jason2',
          nameLast: 'Jack',
          password: 'jackjason2',
        },
      });
      const quizId = request('POST', `${url}:${port}/v1/quiz/create`, {
        json: {
          header: session,
          json: { userId: session.userId, title: 'my quiz' }
        }
      });
      const res = request('POST', `${url}:${port}/v1/quiz/attempt`, {
        header: session2,
        json: {userId: session2.userId, quizId: quizId, score: 5};
      });
      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body.toString());
      expect(body.error).toStrictEqual('403 Forbidden');
    });
  });
  describe('400 Bad request', () => {
    test('quizId does not exist', () => {
      const session = request('POST', `${url}:${port}/v1/register/user`, {
        json: {
          email: 'jason@gmail.com',
          nameFirst: 'Jason',
          nameLast: 'Jack',
          password: 'jackjason',
        },
      });
      const res = request('POST', `${url}:${port}/v1/quiz/attempt`, {
        header: session,
        json: {userId: session.userId, quizId: -1, score: 5}
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body.toString());
      expect(body.error).toStrictEqual('400 Bad request');
    });
    test('score is less than 0 or greater than 100', () => {
    test('quizId does not exist', () => {
      const session = request('POST', `${url}:${port}/v1/register/user`, {
        json: {
          email: 'jason@gmail.com',
          nameFirst: 'Jason',
          nameLast: 'Jack',
          password: 'jackjason',
        },
      });
      const quizId = request('POST', `${url}:${port}/v1/quiz/create`, {
        json: {
          header: session,
          json: { userId: session.userId, title: 'my quiz' }
        }
      });
      const res = request('POST', `${url}:${port}/v1/quiz/attempt`, {
        header: session,
        json: {userId: session.userId, quizId: quizId, score: -1};
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body.toString());
      expect(body.error).toStrictEqual('400 Bad request');
    });
  });
  describe('200 OK', () => {
      const session = request('POST', `${url}:${port}/v1/register/user`, {
        json: {
          email: 'jason@gmail.com',
          nameFirst: 'Jason',
          nameLast: 'Jack',
          password: 'jackjason',
        },
      });
      const quizId = request('POST', `${url}:${port}/v1/quiz/create`, {
        json: {
          header: session,
          json: { userId: session.userId, title: 'my quiz' }
        }
      });
      const res = request('POST', `${url}:${port}/v1/quiz/attempt`, {
        header: session,
        json: {userId: session.userId, quizId: quizId, score: 5};
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body.toString());
      expect(body.error).toStrictEqual('200 OK');
  });
})








// Example get request
app.get('/echo', (req: Request, res: Response) => {
  // const result = echo(req.query.echo as string);

  try {
    const result = echo(req.query.echo as string);
    return res.json(result);
  } catch (error) {
    if (error instanceof ToohakError) {
      return res.status(400).json({
        error: error.error,
        message: error.message
      });
    };
    return res.status(400).json({
      error: 'INVALID_ECHO',
      message: 'Unknown error occurred'
    });
  };

  // if ('error' in result && result.error === 'INVALID_ECHO') {
  //   return res.status(400).json(result);
  // }

  // return res.json(result);
});

// Iteration 2 (Using Iteration 1)
// auth

// Register a new admin user
app.post('/v1/admin/auth/register', (req: Request, res: Response) => {
  const { email, password, nameFirst, nameLast } = req.body;
  try {
    const result = adminAuthRegister(email, password, nameFirst, nameLast);
    const session = generateSession(result.userId as number);
    return res.status(200).json({ session: session.sessionId });
  } catch (error) {
    if (error instanceof ToohakError) {
      return res.status(400).json({ error: error.error, message: error.message });
    }
  }
});

// Login an admin user
app.post('/v1/admin/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  // const result = adminAuthLogin(email, password) as
  //   | SuccessResponse
  //   | errorResponse;

  try {
    const result = adminAuthLogin(email, password) as SuccessResponse;
    const session = generateSession(result.userId as number);
    return res.status(200).json({ session: session.sessionId });
  } catch (error) {
    if (error instanceof ToohakError) {
      return res.status(400).json({
        error: error.error,
        message: error.message
      });
    };
  };

  // if ('error' in result) {
  //   return res.status(400).json(result);
  // }
  // const session = generateSession(result.userId as number);
  // return res.status(200).json({ session: session.sessionId });
});

// Get the details of an admin user
// Get the details of an admin user
app.get('/v1/admin/user/details', (req: Request, res: Response) => {
  try {
    const sessionId = String(req.header('session'));
    const validSession: Session = findSession(sessionId);
    const result = adminUserDetails(validSession.userId);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ToohakError) {
      return res.status(401).json({
        error: error.error,
        message: error.message,
      });
    }

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
  }
});

// Update the details of an admin user
app.put('/v1/admin/user/details', (req: Request, res: Response) => {
  try {
    const session = String(req.header('session'));
    const { email, nameFirst, nameLast } = req.body;
    const validSessionId: Session = findSession(session);
    adminUserDetailsUpdate(validSessionId.userId, email, nameFirst, nameLast);
    return res.status(200).json({});
  } catch (error) {
    if (error instanceof ToohakError) {
      const statusCode = error.error === 'UNAUTHORISED' ? 401 : 400;
      return res.status(statusCode).json({ error: error.error, message: error.message });
    }
  }
});

// Update the password of this admin user
app.put('/v1/admin/user/password', (req: Request, res: Response) => {
  try {
    const session = String(req.header('session'));
    const { oldPassword, newPassword } = req.body;
    const validSessionId: Session = findSession(session);
    adminUserPasswordUpdate(validSessionId.userId, oldPassword, newPassword);
    return res.status(200).json({});
  } catch (error) {
    if (error instanceof ToohakError) {
      const statusCode = error.error === 'UNAUTHORISED' ? 401 : 400;
      return res.status(statusCode).json({ error: error.error, message: error.message });
    }
  }
});

// quiz
// Lists all user's quizzzes
app.get('/v1/admin/quiz/list', (req: Request, res: Response) => {
  try {
    const sessionId = String(req.header('session'));
    const validSession: Session = findSession(sessionId);
    const result = adminQuizList(validSession.userId);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ToohakError) {
      const statusCode = error.error === 'UNAUTHORISED' ? 401 : 400;
      return res.status(statusCode).json({
        error: error.error,
        message: error.message,
      });
    }

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
  }
});

// Create a new quiz
app.post('/v1/admin/quiz', (req: Request, res: Response) => {
  const sessionId = req.header('session');
  const { name, description } = req.body;
  try {
    // Validate session
    const session = findSession(sessionId as string);

    // When a function is called, exceptions will be caught.
    const result = adminQuizCreate(session.userId, name, description);

    return res.status(200).json(result);
  } catch (error) {
    // Return the status code based on the error type.
    if (error instanceof ToohakError) {
      if (error.error === 'UNAUTHORISED') {
        return res.status(401).json({
          error: error.error,
          message: error.message
        });
      }
    }

    if (error instanceof ToohakError) {
      if (error.error === 'INVALID_QUIZ_NAME' || error.error === 'DUPLICATE_QUIZ_NAME' || error.error === 'INVALID_DESCRIPTION') {
        return res.status(400).json({
          error: error.error,
          message: error.message
        });
      }
    }
  }
});

// Delete a quiz
app.delete('/v1/admin/quiz/:quizid', (req: Request, res: Response) => {
  const quizId = parseInt(req.params.quizid as string);
  const sessionId = req.header('session');

  try {
    const session = findSession(sessionId as string);
    const result = adminQuizRemove(session.userId, quizId);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ToohakError) {
      if (error.error === 'UNAUTHORISED') {
        return res.status(401).json({
          error: error.error,
          message: error.message
        });
      } else {
        return res.status(403).json({
          error: error.error,
          message: error.message
        });
      }
    };
  };
});

// Find infomation of a quiz
app.get('/v1/admin/quiz/:quizid', (req: Request, res: Response) => {
  const sessionId = req.header('session');
  const quizId = parseInt(req.params.quizid as string);

  try {
    findSession(sessionId as string);
  } catch (error) {
    if (error instanceof ToohakError) {
      return res.status(401).json({
        error: error.error,
        message: error.message
      });
    };
  };

  try {
    const session = findSession(sessionId as string);
    const result = adminQuizInfo(session.userId, quizId);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ToohakError) {
      return res.status(403).json({
        error: error.error,
        message: error.message
      });
    };
  };
});

// Update quiz name
app.put('/v1/admin/quiz/:quizId/name', (req: Request, res: Response) => {
  const quizId = parseInt(req.params.quizId as string);
  const sessionId = req.header('session');
  const { name } = req.body;

  // if ('error' in session) {
  //   // 401: unauthorised, returns the error
  //   return res.status(401).json(session);
  // }

  // const result = adminQuizNameUpdate(session.userId, quizId, name);

  try {
    const session = findSession(sessionId as string);
    const result = adminQuizNameUpdate(session.userId, quizId, name);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ToohakError) {
      if (error.error === 'INVALID_QUIZ_ID') {
        return res.status(403).json({
          error: error.error,
          message: error.message
        });
      } else if (error.error === 'INVALID_QUIZ_NAME' || error.error === 'DUPLICATE_QUIZ_NAME') {
        return res.status(400).json({
          error: error.error,
          message: error.message
        });
      } else {
        return res.status(401).json({
          error: error.error,
          message: error.message
        });
      };
    };
  };

  // if ('error' in result) {
  //   if (result.error === 'INVALID_QUIZ_ID') {
  //     // 403: forbidden, returns the error
  //     return res.status(403).json(result);
  //   } else {
  //     // 400: bad req, returns the error
  //     return res.status(400).json(result);
  //   }
  // }

  // // 200: success, returns {}
  // return res.status(200).json(result);
});

// Update quiz description
app.put('/v1/admin/quiz/:quizid/description', (req: Request, res: Response) => {
  const sessionId = req.header('session');
  const quizId = parseInt(req.params.quizid as string, 10);
  const { description } = req.body;

  try {
    // Validate session
    const session = findSession(sessionId as string);

    // When a function is called, exceptions will be caught.
    adminQuizDescriptionUpdate(session.userId, quizId, description);

    return res.status(200).json({});
  } catch (error) {
    if (error instanceof ToohakError) {
      // Return the status code based on the error type.
      if (error.error === 'INVALID_DESCRIPTION') {
        return res.status(400).json({
          error: error.error,
          message: error.message
        });
      } else if (error.error === 'INVALID_QUIZ_ID') {
        return res.status(403).json({
          error: error.error,
          message: error.message
        });
      } else {
        return res.status(401).json({
          error: error.error,
          message: error.message
        });
      }
    }
  }
});

// other
app.delete('/v1/clear', (_req: Request, res: Response) => {
  try {
    const result = clear();
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ToohakError) {
      return res.status(400).json({
        error: error.error,
        message: error.message,
      });
    }

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
  }
});

// Iteration 2

app.post('/v1/admin/auth/logout', (req: Request, res: Response) => {
  const sessionId = String(req.header('session'));
  // const result = removeSession(sessionId);

  try {
    removeSession(sessionId);
    return res.status(200).json({});
  } catch (error) {
    if (error instanceof ToohakError) {
      return res.status(401).json({
        error: error.error,
        message: error.message
      });
    };
  };

  // if ('error' in result) {
  //   return res.status(401).json(result);
  // }
  // return res.status(200).json({});
});

// Update the quiz thumbnail
app.put('/v1/admin/quiz/:quizid/thumbnail', (req: Request, res: Response) => {
  const quizId = parseInt(req.params.quizid);
  const sessionId = req.header('session');

  try {
    findSession(sessionId as string);
  } catch (error) {
    if (error instanceof ToohakError) {
      return res.status(401).json({
        error: error.error,
        message: error.message
      });
    };
  };

  try {
    const session = findSession(sessionId as string);
    const result = updateThumbnail(quizId, session.userId, req.body.thumbnailUrl);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ToohakError) {
      if (error.error === 'INVALID_THUMBNAIL') {
        return res.status(400).json({
          error: error.error,
          message: error.message
        });
      } else if (error.error === 'INVALID_QUIZ_ID') {
        return res.status(403).json({
          error: error.error,
          message: error.message
        });
      }
    };
  };
});

// Create quiz question
app.post('/v1/admin/quiz/:quizid/question', (req: Request, res: Response) => {
  const quizId = parseInt(req.params.quizid as string);
  const sessionId = req.header('session');

  try {
    const session = findSession(sessionId as string);
    const questionBody = req.body.questionBody || req.body;
    const result = adminQuizQuestionCreate(quizId, session.userId, questionBody);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ToohakError) {
      if (error.error === 'UNAUTHORISED')
        return res.status(401).json({ error: error.error, message: error.message });
      if (error.error === 'INVALID_QUIZ_ID')
        return res.status(403).json({ error: error.error, message: error.message });
      return res.status(400).json({ error: error.error, message: error.message });
    }

    console.error('Unhandled error in create question route:', error);
    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected error'
    });
  }
});

// update quiz question
app.put('/v1/admin/quiz/:quizid/question/:questionid', (req: Request, res: Response) => {
  const quizId = parseInt(req.params.quizid, 10);
  const questionId = parseInt(req.params.questionid, 10);
  const sessionId = String(req.header('session'));

  try {
    const session = findSession(sessionId);
    if ('error' in session) {
      throw new ToohakError('UNAUTHORISED', 'Invalid or expired session');
    }

    updateQuizQuestion(session.userId, quizId, questionId, req.body.questionBody);
    return res.status(200).json({});
  } catch (error) {
    if (error instanceof ToohakError) {
      switch (error.error) {
        case 'UNAUTHORISED':
          return res.status(401).json({
            error: error.error,
            message: error.message,
          });
        case 'INVALID_QUIZ_ID':
          return res.status(403).json({
            error: error.error,
            message: error.message,
          });
        case 'INVALID_QUESTION_ID':
        case 'INVALID_QUESTION':
        case 'INVALID_ANSWERS':
        case 'INVALID_TIMELIMIT':
        case 'INVALID_THUMBNAIL':
          return res.status(400).json({
            error: error.error,
            message: error.message,
          });
        default:
          return res.status(400).json({
            error: error.error,
            message: error.message,
          });
      }
    }

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
  }
});

// Delete quiz question
app.delete('/v1/admin/quiz/:quizid/question/:questionid', (req: Request, res: Response) => {
  const sessionId = req.header('session');
  const quizId = parseInt(req.params.quizid);
  const questionId = parseInt(req.params.questionid);
  try {
    // Validate session
    const session = findSession(sessionId as string);

    // When a function is called, exceptions will be caught.
    deleteQuizQuestion(session.userId, quizId, questionId);

    return res.status(200).json({});
  } catch (error) {
    if (error instanceof ToohakError) {
      // Return the status code based on the error type.
      if (error.error === 'INVALID_QUESTION_ID' || error.error === 'ACTIVE_GAME_EXISTS') {
        return res.status(400).json({ error: error.error, message: error.message });
      } else if (error.error === 'INVALID_QUIZ_ID') {
        return res.status(403).json({
          error: error.error,
          message: error.message
        });
      } else {
        return res.status(401).json({
          error: error.error,
          message: error.message
        });
      }
    }
  }
});

// ITERATION 3 ROUTES

app.get('/v1/admin/quiz/:quizid/games', (req: Request, res: Response) => {
  const sessionId = req.header('session');
  const quizId = parseInt(req.params.quizid, 10);

  try {
    const session = findSession(sessionId as string);
    const result = adminQuizGames(session.userId, quizId);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ToohakError) {
      switch (error.error) {
        case 'UNAUTHORISED':
          return res.status(401).json({ error: error.error, message: error.message });
        case 'INVALID_QUIZ_ID':
          return res.status(403).json({ error: error.error, message: error.message });
        default:
          return res.status(400).json({ error: error.error, message: error.message });
      }
    }
    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
  }
});

app.post('/v1/admin/quiz/:quizid/game/start', (req: Request, res: Response) => {
  const sessionId = req.header('session');
  const quizId = parseInt(req.params.quizid, 10);
  const { autoStartNum } = req.body;

  try {
    const session = findSession(sessionId as string);
    const result = adminQuizGameStart(session.userId, quizId, autoStartNum);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ToohakError) {
      if (error.error === 'UNAUTHORISED') {
        return res.status(401).json({ error: error.error, message: error.message });
      }
      if (error.error === 'INVALID_QUIZ_ID') {
        return res.status(403).json({ error: error.error, message: error.message });
      }
      return res.status(400).json({ error: error.error, message: error.message });
    }

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
  }
});

// Update a quiz question state
app.put('/v1/admin/quiz/:quizid/game/:gameid', (req: Request, res: Response) => {
  const sessionId = req.header('session');
  const quizId = parseInt(req.params.quizid, 10);
  const gameId = parseInt(req.params.gameid, 10);
  const { action } = req.body;

  try {
    const session = findSession(sessionId as string);
    const result = adminQuizGameStateUpdate(session.userId, quizId, gameId, { action });
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ToohakError) {
      if (error.error === 'UNAUTHORISED') {
        return res.status(401).json({ error: error.error, message: error.message });
      } else if (error.error === 'INVALID_QUIZ_ID') {
        return res.status(403).json({ error: error.error, message: error.message });
      }
      return res.status(400).json({ error: error.error, message: error.message });
    }

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
  }
});

// Get quiz game status
app.get('/v1/admin/quiz/:quizid/game/:gameid', (req: Request, res: Response) => {
  const sessionId = req.header('session');
  const quizId = parseInt(req.params.quizid, 10);
  const gameId = parseInt(req.params.gameid, 10);

  try {
    const session = findSession(sessionId as string);
    const gameStatus = adminGetQuizGameStatus(session.userId, quizId, gameId);

    return res.status(200).json(gameStatus);
  } catch (error) {
    if (error instanceof ToohakError) {
      if (error.error === 'UNAUTHORISED') {
        return res.status(401).json({ error: error.error, message: error.message });
      } else if (error.error === 'INVALID_QUIZ_ID') {
        return res.status(403).json({ error: error.error, message: error.message });
      }
      return res.status(400).json({ error: error.error, message: error.message });
    }

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
  }
});

// Get quiz game results
app.get('/v1/admin/quiz/:quizid/game/:gameid/results', (req: Request, res: Response) => {
  const sessionId = req.header('session');
  const quizId = parseInt(req.params.quizid);
  const gameId = parseInt(req.params.gameid);

  try {
    const session = findSession(sessionId as string);
    const gameResults = adminGetQuizGameResults(session.userId, quizId, gameId);

    return res.status(200).json(gameResults);
  } catch (error) {
    if (error instanceof ToohakError) {
      if (error.error === 'UNAUTHORISED') {
        return res.status(401).json({ error: error.error, message: error.message });
      } else if (error.error === 'INVALID_QUIZ_ID') {
        return res.status(403).json({ error: error.error, message: error.message });
      }
      return res.status(400).json({ error: error.error, message: error.message });
    }

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
  }
});

// Get status of guest player in game
app.get('/v1/player/:playerid', (req: Request, res: Response) => {
  const playerId = parseInt(req.params.playerid);

  try {
    const result = adminQuizGetPlayerStatusInGame(playerId);
    console.log(getData().activeGames[0].players);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ToohakError) {
      return res.status(400).json({
        error: error.error,
        message: error.message
      });
    }
  };
});

// New guest player joins a active game
app.post('/v1/player/join', (req: Request, res: Response) => {
  const gameId = parseInt(req.body.gameId);
  const playerName = req.body.playerName;
  try {
    const result = adminQuizGuestJoinGame(gameId, playerName);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ToohakError) {
      return res.status(400).json({
        error: error.error,
        message: error.message
      });
    }
  }
});

app.put('/v1/player/:playerid/question/:questionposition/answer', (req: Request, res: Response) => {
  const playerId = parseInt(req.params.playerid);
  const questionPosition = parseInt(req.params.questionposition);
  const { answerIds } = req.body;

  try {
    const result = playerQuestionAnswer(answerIds, playerId, questionPosition);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ToohakError) {
      return res.status(400).json({
        error: error.error,
        message: error.message
      });
    }
    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
  }
});

app.get('/v1/player/:playerid/question/:questionposition', (req: Request, res: Response) => {
  const playerId = parseInt(req.params.playerid);
  const questionPosition = parseInt(req.params.questionposition);

  try {
    const result = getPlayerQuestionInfo(playerId, questionPosition);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ToohakError) {
      return res.status(400).json({
        error: error.error,
        message: error.message
      });
    }
    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
  }
});

app.get('/v1/player/:playerid/question/:questionposition/results', (req: Request, res: Response) => {
  const playerId = parseInt(req.params.playerid);
  const questionPosition = parseInt(req.params.questionposition);

  try {
    const result = getPlayerQuestionResults(playerId, questionPosition);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ToohakError) {
      return res.status(400).json({
        error: error.error,
        message: error.message
      });
    }
    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
  }
});

app.get('/v1/player/:playerid/results', (req: Request, res: Response) => {
  const playerId = parseInt(req.params.playerid);

  try {
    const result = getPlayerFinalResults(playerId);
    console.log(result);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ToohakError) {
      return res.status(400).json({
        error: error.error,
        message: error.message
      });
    }
    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
  }
});

// ====================================================================
//  ================= WORK IS DONE ABOVE THIS LINE ===================
// ====================================================================

app.use((req: Request, res: Response) => {
  const message = `
    Route not found - This could be because:
      0. You have defined routes below (not above) this middleware in server.ts
      1. You have not implemented the route ${req.method} ${req.path}
      2. There is a typo in either your test or server, e.g. /posts/list in one
         and, incorrectly, /post/list in the other
      3. You are using 'npm start' (instead of 'npm run dev') to start your server and
         have forgotten to manually restart to load the new changes
      4. You've forgotten a leading slash (/), e.g. you have posts/list instead
         of /posts/list in your server.ts or test file
  `;

  res.status(404).json({ error: 'ROUTE_NOT_FOUND', message });
});

// start server
const server = app.listen(PORT, HOST, () => {
  // DO NOT CHANGE THIS LINE
  console.log(`⚡️ Server started on port ${PORT} at ${HOST}`);
  loadData();
  setInterval(saveData, 5000);
});

// For coverage, handle Ctrl+C gracefully
process.on('SIGINT', () => {
  server.close(() => {
    saveData();
    console.log('Shutting down server gracefully.');
    process.exit();
  });
});
