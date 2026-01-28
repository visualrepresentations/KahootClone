import { getData } from './dataStore.js';
import validator from 'validator';
import { validateEmail, validateName, validatePassword, validateUserId, hashPassword } from './helper';
import { ToohakError } from './toohakError';
import { updateLanguageServiceSourceFile } from 'typescript';
import { appendFile } from 'fs';

interface User {
  userId: number;
  nameFirst: string;
  nameLast: string;
  email: string;
  password: string;
  previousPasswords: string[];
  numSuccessfulLogins: number;
  numFailedPasswordsSinceLastLogin: number;
}

interface Quiz {
  creatorId: number;
  quizId: number;
  name: string;
  timeCreated: number;
  timeLastEdited: number;
  description: string;
}

interface Session {
  sessionId: string;
  userId: number;
  createdAt: number;
  lastAccessed: number;
}

interface Data {
  users: User[];
  quizzes: Quiz[];
  sessions: Session[];
}

interface userIdSuccessResponse {
  userId: number;
}

interface errorResponse {
  error: string;
  message: string;
}

type adminResponse = errorResponse | userIdSuccessResponse | unknown;

export function adminQuizStar(
  userId: number,
  quizId: number
): adminResponse {
  const data: Data = getData();
  const users: User[]  = data.users;
  const quizzes: Quiz[] = data.quizzes;
  if (!data.users.find(a => a.userId === userId)) {
    throw new Error("UNAUTHORISED");
  }
  const quiz = quizzes.find(a => a.quizId === quizId);
  if (!quiz) {
    throw new Error("INVALID_QUIZ_ID");
  }
  if (quiz.creatorId !== userId) {
    throw new Error("FORBIDDEN");
  }
  if (quiz.isStarred === true) {
    throw new Error("ALREADY_STARRED");
  }

  quiz.isStarred = true;
  quiz.timeLastEdited = Math.floor(Date.now() / 1000);

  return {};
}


// ========== [MAIN FUNCTIONS] ==========
/**
 * Function which handles the registration of a new user and returns their userId value
 *
 *
 * @param {string} email - the email address of the user
 * @param {string} password - the password correlating to the user's email address
 * @param {string} nameFirst - the first name of the user
 * @param {string} nameLast - the last name of the user
 *
 * @returns {string} - the userId of the newly registered user
*/
function adminAuthRegister(email: string, password: string, nameFirst: string, nameLast: string): userIdSuccessResponse {
  const data: Data = getData();
  const userId: number = data.users.length + 1;
  validateEmail(email);
  validateName(nameFirst, 'first');
  validateName(nameLast, 'last');
  validatePassword(password);
  const passwordHash = hashPassword(password);
  const newUser: User = {
    userId: userId,
    nameFirst: nameFirst,
    nameLast: nameLast,
    email: email,
    password: passwordHash,
    previousPasswords: [],
    numSuccessfulLogins: 1,
    numFailedPasswordsSinceLastLogin: 0
  };

  data.users.push(newUser);
  return { userId: userId };
}

/**
 * Given a registered user's email and password, return their userId value.
 *
 * @param {string} email - the email address of the user
 * @param {string} password - the password of the user
 * ...
 *
 * @returns {int} - the userId value
*/
function adminAuthLogin(email: string, password: string):
  errorResponse | {
    userId: number;
  } {
  // get list of users
  const users = getData().users;
  let userIndex = 0;

  // check each user for matching email & password.
  for (const user of users) {
    if (email === user.email) {
      if (hashPassword(password) === user.password) {
        users[userIndex].numSuccessfulLogins++;
        users[userIndex].numFailedPasswordsSinceLastLogin = 0;
        return {
          userId: user.userId
        };

        // password doesnt match
      } else {
        users[userIndex].numFailedPasswordsSinceLastLogin++;
        throw new ToohakError(
          'INVALID_CREDENTIALS',
          'Password is not correct for the given email.'
        );
      }
    }
    userIndex++;
  }
  // if no user is found
  throw new ToohakError('INVALID_CREDENTIALS', 'Email address does not exist.');
}

/**
 * Takes in an admin's userId and returns details about the user
 *
 * @param {string} userId - the userId of the admin
 * ...git
 * ...
 *
 * @returns {int} - the userId value
 * @returns {string} - the user's full name
 * @returns {string} - the user's email address
 * @returns {int} - the number of successful logins of the user
 * @returns {int} - the number of times the user has failed a password since their last login
*/
function adminUserDetails(userId: number): {
  user: {
    userId: number;
    name: string;
    email: string;
    numSuccessfulLogins: number;
    numFailedPasswordsSinceLastLogin: number;
  };
} {
  const data = getData();
  validateUserId(userId);

  if (!data.users || data.users.length === 0) {
    throw new ToohakError('UNAUTHORISED', 'No users exist in the system');
  }

  const user = data.users.find((u: User) => u.userId === userId);
  if (!user) {
    throw new ToohakError('UNAUTHORISED', 'User not found');
  }

  validateName(user.nameFirst, 'first');
  validateName(user.nameLast, 'last');

  return {
    user: {
      userId: user.userId,
      name: `${user.nameFirst} ${user.nameLast}`,
      email: user.email,
      numSuccessfulLogins: user.numSuccessfulLogins,
      numFailedPasswordsSinceLastLogin: user.numFailedPasswordsSinceLastLogin,
    },
  };
}

/**
  * Function which updates the password of a logged-in user
  *
  * @param {string} userId - the unique identifier of the user
  * @param {string} oldPassword - the current password of the user (for verification)
  * @param {string} newPassword - the new password to replace the old one
  *
  * @returns {Object} - confirmation object indicating success or failure
  */
function adminUserPasswordUpdate(userId: number, oldPassword: string, newPassword: string): adminResponse {
  const data: Data = getData();

  const currentUser = (data.users).find(user => user.userId === userId);
  if (!currentUser) {
    throw new ToohakError('UNAUTHORISED', 'userId is not a valid user');
  }

  if (hashPassword(oldPassword) !== currentUser.password) {
    throw new ToohakError('INVALID_OLD_PASSWORD', 'Old Password is not the correct old password');
  }

  if (oldPassword === newPassword) {
    throw new ToohakError('INVALID_NEW_PASSWORD', 'Old Password and New Password match exactly');
  }

  if (currentUser.previousPasswords.includes(hashPassword(newPassword))) {
    throw new ToohakError('INVALID_NEW_PASSWORD', 'New Password has already been used before by this user');
  }

  validatePassword(newPassword);

  currentUser.previousPasswords.push(currentUser.password);
  currentUser.password = hashPassword(newPassword);
  return {};
}

/**
  * Function which updates the details of a logged-in admin user
  *
  * @param {string} userId - the unique identifier of the admin user
  * @param {string} email - the updated email address of the admin user
  * @param {string} nameFirst - the updated first name of the admin user
  * @param {string} nameLast - the updated last name of the admin user
  *
  * @returns {Object} - confirmation or updated user object after changes\
  *
  */
function adminUserDetailsUpdate(userId: number, email: string, nameFirst: string, nameLast: string): errorResponse | object {
  const data = getData();
  validateUserId(userId);

  const existingUsers = (getData().users);
  if (existingUsers.find((user: User) => (user.email === email && user.userId !== userId))) {
    throw new ToohakError('INVALID_EMAIL', 'Email address is currently used by another user');
  }

  if (!(validator.isEmail(email))) {
    throw new ToohakError('INVALID_EMAIL', 'Invalid email address');
  }

  validateName(nameFirst, 'first');
  validateName(nameLast, 'last');

  const currentUser = (data.users).find((user: User) => user.userId === userId) as User;
  currentUser.email = email;
  currentUser.nameFirst = nameFirst;
  currentUser.nameLast = nameLast;
  return {};
}

// ========== [EXPORT STATEMENTS] ==========

export { adminAuthRegister, adminAuthLogin, adminUserDetails, adminUserPasswordUpdate, adminUserDetailsUpdate, errorResponse };
