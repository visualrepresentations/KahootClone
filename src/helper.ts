// ========== [HELPER FUNCTIONS] ==========
import validator from 'validator';
import { adminAuthRegister, errorResponse } from './auth';
import { getData } from './dataStore';
import { ToohakError } from './toohakError';
import { User, Session, Colour, Game } from './interfaces';
import crypto from 'crypto';
/**
 * Function which validates if the email address is currently being used by another user, as well as validating the email itself
 *
 * @param {string} email - the email address of the user wishing to register
 * @param {array} existingUsers - the users array from the data object
 *
 * @returns {{isValid: boolean, errorMessage: string}}
*/
function validateEmail(email: string): void {
  const existingUsers = (getData().users);
  if (existingUsers.find((user: User) => user.email === email)) {
    throw new ToohakError('INVALID_EMAIL', 'Email address is used by another user');
  }

  if (!(validator.isEmail(email))) {
    throw new ToohakError('INVALID_EMAIL', 'Email does not satisfy validator.isEmail');
  }

  // return {
  //   isValid: true,
  //   errorMessage: ''
  // };
}

/**
 * Function which validates the first/last name of the user
 * IMPORTANT NOTE: since we are lumping the first and last name function in the same string, the error message must be modified by whichever function calls this helper function, since this function does not know
 * if it is the first or last name which is ivalid. tldr in the error message you must add if it is nameFirst or nameLast which is invalid
 *
 * @param {string} name - the first/last name of the user
 *
 * @returns {{isValid: boolean, errorMessage: string}}
*/
function validateName(name: string, field: string): void {
  if (name.length < 2 || name.length > 20) {
    throw new ToohakError(
      `INVALID_${field.toUpperCase()}_NAME`,
      `${field} name is less than 2 characters or more than 20 characters`
    );
  }

  if (!/^[a-zA-Z\s\-']+$/.test(name)) {
    throw new ToohakError(
      `INVALID_${field.toUpperCase()}_NAME`,
      `${field} name contains characters other than lowercase letters, uppercase letters, spaces, hyphens, or apostrophes`
    );
  }
}

/**
 * Function which validates the password the user wishes to use
 *
 * @param {string} password - the password that the user wishes to use
 *
 * @returns {{isValid: boolean, errorMessage: string}}
*/
function validatePassword(password: string): void {
  if (password.length < 8) {
    throw new ToohakError('INVALID_PASSWORD', 'Password is less than 8 characters');
  }

  if (!/^(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
    throw new ToohakError('INVALID_PASSWORD', 'Password does not contain at least one number and at least one letter');
  }
}

/**
 * Function which validates userId
 *
 * @param {string} userId - the password that the user wishes to use
 *
 * @returns {{isValid: boolean, errorMessage: string}}
*/
function validateUserId(userId: number): void {
  const data = getData();
  const user = data.users.find((user: User) => user.userId === userId);
  if (!user) {
    throw new ToohakError('UNAUTHORISED', 'userId is not a valid user');
  }
}

/**
 * Function checks whether valid or not
 *
 * @param {number} quizId
 * @returns {boolean} return true if database contains corresponding quiz, otherwise return false
 */
function validQuizId(quizId: number): void {
  const data = getData();

  for (const id of data.quizzes) {
    if (id.quizId === quizId) {
      return;
    }
  }
  throw new ToohakError('INVALID_QUIZ_ID', 'QuizID does not refer to a quiz');
}

/**
 * Function which automatically registers a new user for testing.
 *
 * This helper is used to streamline test setup by registering a valid user
 * with default values, while allowing customisation through optional parameters.
 *
 * @param {string} [email='test@example.com'] - the email address of the new user
 * @param {string} [password='password123'] - the password of the new user
 * @param {string} [nameFirst='Test'] - the first name of the new user
 * @param {string} [nameLast='User'] - the last name of the new user
 *
 * @returns {{userId: number}} - the object containing the userId of the registered user
 */
function registerTestUser(
  email = 'test@example.com',
  password = 'password123',
  nameFirst = 'Test',
  nameLast = 'User'
) {
  return adminAuthRegister(email, password, nameFirst, nameLast);
}

/**
 * Get current time
 *
 * @returns {number} - current time
 */
function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * This function takes a session id and retrive through the database, returns corresponding session object if the session if found,
 * otherwise return errorResponse
 *
 * @param sessionNum session id
 * @returns session object if found
 */

function findSession(sessionNum: string): Session {
  const data = getData();
  if (!Array.isArray(data.sessions)) {
    data.sessions = [];
  }

  for (const session of data.sessions) {
    if (sessionNum === session.sessionId) {
      session.lastAccessed = Math.floor(Date.now() / 1000);
      return session;
    }
  }
  throw new ToohakError('UNAUTHORISED', 'Invalid or expired session ID');
};

function removeSession(sessionNum: string): errorResponse | object {
  const data = getData();
  for (const sessionToRemove of data.sessions) {
    if (sessionNum === sessionToRemove.sessionId) {
      data.sessions = data.sessions.filter((session: Session) => session.sessionId !== sessionNum);
      return {};
    }
  }
  throw new ToohakError('UNAUTHORISED', 'session id is empty or invalid');
}

/**
 * This function takes a userId and generates a random sessionID and adds it to the database
 *
 * @param {number} userId userID
 * @returns {session} newSession
 */

function generateSession(userId: number): { sessionId: string; userId: number; createdAt: number; lastAccessed: number } {
  const data = getData();

  let sessionId: string = '';
  let isUnique = false;

  while (!isUnique) {
    const randomNum = Math.floor(Math.random() * 999000) + 1000;
    sessionId = randomNum.toString();

    const existingSession = data.sessions.find((session: Session) => session.sessionId === sessionId);
    if (!existingSession) {
      isUnique = true;
    }
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const newSession = {
    sessionId: sessionId,
    userId: userId,
    createdAt: currentTime,
    lastAccessed: currentTime
  };

  data.sessions.push(newSession);

  return newSession;
}

export const generateColour = (): string => {
  const colours = Object.keys(Colour);
  return colours[Math.floor(Math.random()) % colours.length];
};

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

/**
 * @param gameId game ID
 * @param state state of the game, the game is in active or inactive
 * @returns object of game of found game
 * @throws {ToohakError} if game not found
 */
export function findGame(gameId: number, state: 'active' | 'inactive'): Game {
  const data = getData();
  if (state === 'active') {
    const result = data.activeGames.find(game => game.gameId === gameId);
    if (!result) {
      throw new ToohakError('INVALID_GAME_ID', 'Game Id does not refer to a valid game');
    }
    return result;
  } else {
    const result = data.inactiveGames.find(game => game.gameId === gameId);
    if (!result) {
      throw new ToohakError('INVALID_GAME_ID', 'Game Id does not refer to a valid game');
    }
    return result;
  }
}

export function findGameFromPlayer(playerid: number): Game {
  const data = getData();
  const gameWithPlayer = data.activeGames.find(game => game.players.some(player => player.playerId === playerid));
  if (!gameWithPlayer) {
    throw new ToohakError('INVALID_PLAYER_ID', 'Player ID does not exist');
  }
  return gameWithPlayer;
}

export { validateEmail, validateName, validatePassword, validateUserId, validQuizId, registerTestUser, getCurrentTimestamp, findSession, removeSession, generateSession };
