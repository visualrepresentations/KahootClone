import { getData, timers, timerState } from './dataStore';
import { validateUserId, validQuizId, getCurrentTimestamp, generateColour, findGame, findGameFromPlayer } from './helper';
import { Data, Question, QuestionBody, Quiz, Game, Player, VALID_ACTIONS } from './interfaces.js';
import { ToohakError } from './toohakError.js';
import cryptoRandomString from 'crypto-random-string';

/**
*
*  Function which provides a list of all quizzes owned by the currently logged-in user*
*  @param {string} userId - the unique identifier of the user
*
*  @returns {Object} - an object containing an array of quizzes,
*  each quiz with its quizId and name
*/
function adminQuizList(userId: number): { quizzes: { quizId: number; name: string }[] } {
  // const validation = validateUserId(userId);

  try {
    validateUserId(userId);
  } catch (error) {
    if (error instanceof ToohakError) {
      throw new ToohakError('UNAUTHORISED', error.message);
    };
  };

  // if (!validation.isValid) {
  //   return {
  //     error: 'UNAUTHORISED',
  //     message: validation.errorMessage,
  //   };
  // }

  const data = getData();
  const userQuizzes = data.quizzes.filter((q: Quiz) => q.creatorId === userId);

  return {
    quizzes: userQuizzes.map((q: Quiz) => ({
      quizId: q.quizId,
      name: q.name,
    })),
  };
}

/**
 * Given basic details about a new quiz, create one for the logged in user.
 *
 * @param {int} userId user ID
 * @param {string} name name of the quiz
 * @param {string} description description of quiz
 * @returns {Object} - Object containing the result of the quiz creation
 */
function adminQuizCreate(userId: number, name: string, description: string): { quizId: number } {
  const data: Data = getData();

  // 1. Verify that the user ID is valid
  validateUserId(userId);

  // 2. Verify quiz name format
  const nameRegex = /^[a-zA-Z0-9 ]+$/;
  if (!nameRegex.test(name)) {
    throw new ToohakError(
      'INVALID_QUIZ_NAME',
      'Name contains invalid characters. Valid characters are alphanumeric and spaces.'
    );
  }
  // Check the quiz name length
  if (name.length < 3 || name.length > 30) {
    throw new ToohakError(
      'INVALID_QUIZ_NAME',
      'Name is either less than 3 characters long or more than 30 characters long.'
    );
  }

  // 3. Verify that the quiz name is not duplicated
  const isDuplicateName = data.quizzes.some(
    quiz => quiz.creatorId === userId && quiz.name === name
  );
  if (isDuplicateName) {
    throw new ToohakError(
      'DUPLICATE_QUIZ_NAME',
      'Name is already used by the current logged in user for another quiz.'
    );
  }

  // 4. Verify description length
  if (description.length > 100) {
    throw new ToohakError(
      'INVALID_DESCRIPTION',
      'Description is more than 100 characters in length.'
    );
  }

  // 5. Generate a new quiz ID and create the quiz
  let newQuizId = 1;
  if (data.quizzes.length > 0) {
    newQuizId = Math.max(...data.quizzes.map(q => q.quizId)) + 1;
  }
  const timestamp = getCurrentTimestamp();
  const newQuiz: Quiz = {
    creatorId: userId,
    quizId: newQuizId,
    name: name,
    description: description,
    timeCreated: timestamp,
    timeLastEdited: timestamp,
    numQuestions: 0,
    questions: [],
    timeLimit: 0,
    thumbnailUrl: '',
    gameId: 0,
  };
  data.quizzes.push(newQuiz);

  return { quizId: newQuizId };
}

/**
 * Given a particular quiz, permanently remove the quiz.
 *
 * @param {int} userId user ID
 * @param {int} quizId quiz ID
 * @returns empty object
 */
function adminQuizRemove(userId: number, quizId: number): Record<never, never> {
  try {
    validateUserId(userId);
  } catch (error) {
    if (error instanceof ToohakError) {
      throw new ToohakError('UNAUTHORISED', 'userId is not a valid user');
    };
  };

  try {
    validQuizId(quizId);
  } catch (error) {
    if (error instanceof ToohakError) {
      throw new ToohakError('userId is not a valid user', 'Quiz ID does not refer to a valid quiz.');
    };
  };

  const data = getData();
  for (const quizIndex in data.quizzes) {
    if (data.quizzes[quizIndex].quizId === quizId) {
      if (data.quizzes[quizIndex].creatorId === userId) {
        const index = parseInt(quizIndex as string);
        data.quizzes.splice(index, 1);
      } else {
        throw new ToohakError('INVALID_QUIZ_ID', 'Quiz ID does not refer to a quiz that this user owns.');
      }
    }
  }
  return {};
}

/**
 * Get all of the relevant information about the current quiz.
 *
 * @param {int} userId user ID
 * @param {int} quizId quiz ID
 * @returns {int} quiz ID
 * @returns {string} quiz name
 * @returns {long} time of quiz created
 * @returns {long} time of last quiz edited
 * @returns {string} description of the quiz
 */
function adminQuizInfo(userId: number, quizId: number): Record<never, never> {
  // quiz check
  if ((() => {
    const data = getData();
    for (const quiz of data.quizzes) {
      if (quiz.quizId === quizId) {
        return true;
      }
    }
    return false;
  })() === false) {
    throw new ToohakError('INVALID_QUIZ_ID', 'Quiz ID does not refer to a valid quiz.');
  };

  try {
    validateUserId(userId);
  } catch {
    throw new ToohakError('UNAUTHORISED', 'userId is not a valid user');
  };
  if ((() => {
    const data = getData();
    for (const quiz of data.quizzes) {
      if (quiz.quizId === quizId && quiz.creatorId !== userId) {
        return true;
      }
    }
    return false;
  })() === true) {
    throw new ToohakError('INVALID_QUIZ_ID', 'Quiz ID does not refer to a quiz that this user owns.');
  }

  // authority check

  const data = getData();
  for (const quiz of data.quizzes) {
    if (quiz.quizId === quizId && quiz.creatorId === userId) {
      return quiz;
    }
  }

  throw new ToohakError('UNKNOWN_ERROR', 'unknow_error_check_code');
}

function updateThumbnail(quizId: number, userId: number, thumbnailURL: string): Record<never, never> {
  try {
    validateUserId(userId);
  } catch {
    throw new ToohakError('INVALID_USER_ID', 'userId is not a valid user');
  };

  try {
    validQuizId(quizId);
  } catch {
    throw new ToohakError('INVALID_QUIZ_ID', 'invalid quiz id');
  };

  if (thumbnailURL.substring(0, 7) !== 'http://' && thumbnailURL.substring(0, 8) !== 'https://') {
    throw new ToohakError('INVALID_THUMBNAIL', 'invalid thumbnail url');
  } else if (
    thumbnailURL.substring(thumbnailURL.length - 4, thumbnailURL.length).toLocaleLowerCase() !== '.jpg'
    && thumbnailURL.substring(thumbnailURL.length - 5, thumbnailURL.length).toLocaleLowerCase() !== '.jpeg'
    && thumbnailURL.substring(thumbnailURL.length - 4, thumbnailURL.length).toLocaleLowerCase() !== '.png') {
    throw new ToohakError('INVALID_THUMBNAIL', 'invalid thumbnail url');
  } else {
    const data = getData();
    for (const quiz of data.quizzes) {
      if (quiz.creatorId === userId) {
        quiz.thumbnailUrl = thumbnailURL;
        quiz.timeLastEdited = getCurrentTimestamp();
        return {};
      }
    }
    throw new ToohakError('INVALID_QUIZ_ID', 'The user is not the owner of this quiz!');
  }
}

function adminQuizQuestionCreate(quizId: number, userId: number, questionBody: QuestionBody) {
  if (!questionBody || typeof questionBody !== 'object') {
    throw new ToohakError('INVALID_REQUEST', 'Question body is missing or malformed');
  }

  // INVALID_QUESTION testing
  const { question, timeLimit, points, answerOptions, thumbnailUrl } = questionBody;

  // Validate user and quiz ownership/existence first to ensure correct 403 mapping
  try {
    validateUserId(userId);
  } catch (error) {
    if (error instanceof ToohakError) {
      throw new ToohakError(
        'UNAUTHORISED',
        error.message
      );
    };
  };

  const data = getData();
  const quizzes = data.quizzes;
  const targetQuizIndex = quizzes.findIndex((q: Quiz) => q.quizId === quizId);
  if (targetQuizIndex === -1) {
    throw new ToohakError(
      'INVALID_QUIZ_ID',
      'Quiz ID does not refer to a valid quiz'
    );
  }
  const targetQuiz = quizzes[targetQuizIndex];
  if (targetQuiz.creatorId !== userId) {
    throw new ToohakError(
      'INVALID_QUIZ_ID',
      'Quiz does not belong to the user'
    );
  }
  if (question.length < 5 || question.length > 50) {
    throw new ToohakError(
      'INVALID_QUESTION',
      'Invalid question length'
    );
  }
  if (points < 1 || points > 10) {
    throw new ToohakError(
      'INVALID_QUESTION',
      'Invalid number of question points'
    );
  }

  // INVALID_ANSWERS TESTING
  if (answerOptions.length > 6 || answerOptions.length < 2) {
    throw new ToohakError(
      'INVALID_ANSWERS',
      'Invalid number of answers'
    );
  }

  const seenAnswers = new Set<string>();
  let correctAnsExists = false;
  for (const answerOption of answerOptions) {
    if (answerOption.answer.length < 1 || answerOption.answer.length > 30) {
      throw new ToohakError(
        'INVALID_ANSWERS',
        'At least one answer has invalid length'
      );
    }
    if (seenAnswers.has(answerOption.answer)) {
      throw new ToohakError(
        'INVALID_ANSWERS',
        'There is at least one duplicate question'
      );
    }
    seenAnswers.add(answerOption.answer);
    if (answerOption.correct) {
      correctAnsExists = true;
    }
  }
  if (!correctAnsExists) {
    throw new ToohakError(
      'INVALID_ANSWERS',
      'None of the answers are right'
    );
  }

  // INVALID_TIMELIMIT testing
  if (timeLimit <= 0) {
    throw new ToohakError(
      'INVALID_TIMELIMIT',
      'Time limit is less than or equal to zero'
    );
  }

  // sum of time limits must not exceed 3 minutes
  const currentSum = (targetQuiz.questions || []).reduce(
    (acc: number, q: Question) => acc + q.timeLimit, 0
  );
  if (currentSum + timeLimit > 180) {
    throw new ToohakError(
      'INVALID_TIMELIMIT',
      'Time limit exceeds 3 minutes'
    );
  }

  // INVALID_TIMETABLE testing
  if (thumbnailUrl === '') {
    throw new ToohakError(
      'INVALID_THUMBNAIL',
      'A thumbnail was not entered'
    );
  }

  const supportedFiles = [
    'png',
    'jpg',
    'jpeg'
  ];
  let isSupportedType = false;
  for (const fileType of supportedFiles) {
    if (thumbnailUrl.endsWith(fileType)) {
      isSupportedType = true;
      break;
    } else if (thumbnailUrl.endsWith(fileType.toUpperCase())) {
      isSupportedType = true;
      break;
    }
  }
  if (!isSupportedType) {
    throw new ToohakError(
      'INVALID_THUMBNAIL',
      'A thumbnail with the supported filetype was not provided'
    );
  }
  if (!(thumbnailUrl.startsWith('http://') || thumbnailUrl.startsWith('https://'))) {
    throw new ToohakError(
      'INVALID_THUMBNAIL',
      'A thumbnail with the supported filetype was not provided'
    );
  }

  let newQuestionId = 1;
  if (targetQuiz.questions.length > 0) {
    newQuestionId = Math.max(...targetQuiz.questions.map((q: Question) => q.questionId)) + 1;
  }

  const newQuestion: Question = {
    questionId: newQuestionId,
    question: question,
    timeLimit: timeLimit,
    thumbnailUrl: thumbnailUrl,
    points: points,
    answerOptions: answerOptions.map((q, id) => ({
      answerId: id + 1,
      answer: q.answer,
      correct: q.correct,
      colour: generateColour()
    }))
  };
  targetQuiz.questions = targetQuiz.questions || [];
  targetQuiz.questions.push(newQuestion);
  targetQuiz.numQuestions += 1;
  // Update quiz last edited time
  targetQuiz.timeLastEdited = getCurrentTimestamp();
  return { questionId: newQuestion.questionId };
}

/**
 *
 * @param {string} userId - the unique identifier of the user
 * @param {string} quizId - the unique identifier of the quiz
 * @param {string} name - the name of the update quiz
 * @returns {object} - Error, or {} for success
 */

function adminQuizNameUpdate(userId: number, quizId: number, name: string): Record<never, never> {
  // check that the user exists

  try {
    validateUserId(userId);
  } catch (error) {
    if (error instanceof ToohakError) {
      throw new ToohakError(
        'UNAUTHORISED',
        error.message
      );
    };
  };

  // verify that the name is valid
  const nameRegex = /^[a-zA-Z0-9 ]+$/;
  if (!nameRegex.test(name)) {
    throw new ToohakError(
      'INVALID_QUIZ_NAME',
      'Name contains invalid characters. Valid characters are alphanumeric and spaces.'
    );
  }
  if (name.length > 30 || name.length < 3) {
    throw new ToohakError(
      'INVALID_QUIZ_NAME',
      'Name is either less than 3 characters long or more than 30 characters long.'
    );
  }
  // check if the quiz id exists

  try {
    validQuizId(quizId);
  } catch {
    throw new ToohakError(
      'INVALID_QUIZ_ID',
      'Quiz ID does not refer to a valid quiz.'
    );
  }

  const data = getData();
  const quizzes = data.quizzes;

  // find the quiz

  const targetQuizIndex = quizzes.findIndex((q: Quiz) => q.quizId === quizId);
  if (targetQuizIndex === -1) {
    throw new ToohakError(
      'INVALID_QUIZ_ID',
      'Quiz ID does not refer to a valid quiz.'
    );
  }
  const targetQuiz = quizzes[targetQuizIndex];
  // check ownership

  if (targetQuiz.creatorId !== userId) {
    throw new ToohakError(
      'INVALID_QUIZ_ID',
      'Quiz ID does not refer to a quiz that this user owns.'
    );
  }
  // check there is no duplicate quiz

  const duplicate = quizzes.find((q: Quiz) => q.creatorId === userId && q.name === name && q.quizId !== quizId);
  if (duplicate) {
    throw new ToohakError(
      'DUPLICATE_QUIZ_NAME',
      'Name is already used by the current logged in user for another quiz.'
    );
  }

  // nothing wrong, change the name
  data.quizzes[targetQuizIndex].name = name;
  return {};
}

/**
 *
 * @param {string} userId - the unique identifier of the user
 * @param {string} quizId - the unique identifier of the quiz
 * @param {string} description - the description of the update quiz
 * @returns {Object} - an object containing the result of the quiz description update
 */

function adminQuizDescriptionUpdate(userId: number, quizId: number, description: string): Record<never, never> {
  // 1. Verify the validity of the user ID
  validateUserId(userId);

  // 2. Verify description length
  if (description.length > 100) {
    throw new ToohakError(
      'INVALID_DESCRIPTION',
      'Description is more than 100 characters in length.'
    );
  }

  // 3. Find the corresponding quiz (Ensure that the quizId found is both the specified one and belongs to the current user.)
  // If can't find quizid, quizIndex = -1
  const data: Data = getData();
  const quizIndex = data.quizzes.findIndex(q => q.quizId === quizId && q.creatorId === userId);

  if (quizIndex === -1) {
    // Check if the quizId is invalid or the user does not own the quiz
    const isQuizExist = data.quizzes.some(q => q.quizId === quizId); // If quiz doesn't exit, isQuizExit = false, otherwise isQuizExit = true
    if (!isQuizExist) {
      throw new ToohakError(
        'INVALID_QUIZ_ID',
        'Quiz ID does not refer to a valid quiz.'
      );
    } else {
      throw new ToohakError(
        'INVALID_QUIZ_ID',
        'Quiz ID does not refer to a quiz that this user owns.'
      );
    }
  }

  // 4. Updates the description, time and returns an empty object to indicate success
  data.quizzes[quizIndex].description = description;
  data.quizzes[quizIndex].timeLastEdited = getCurrentTimestamp();

  return {};
}

/**
 * Deletes a specific question from a quiz that the authenticated user owns.
 *
 * @function deleteQuizQuestion
 * @param {number} userId - The unique identifier of the user attempting to delete the question.
 * @param {number} quizId - The unique identifier of the quiz containing the question.
 * @param {number} questionId - The unique identifier of the question to be deleted.
 * @throws {ToohakError}
 * @returns {Record<never, never>} An empty object `{}` indicating successful deletion.
 */
function deleteQuizQuestion(userId: number, quizId: number, questionId: number): Record<never, never> {
  // Verification User ID
  validateUserId(userId);

  // Verification quiz ID
  validQuizId(quizId);

  // Find the target quiz
  const data = getData();
  const targetQuiz = data.quizzes.find((q: Quiz) => q.quizId === quizId && q.creatorId === userId);
  if (!targetQuiz) {
    throw new ToohakError(
      'INVALID_QUIZ_ID',
      'Valid session is provided, but user is not an owner of this quiz, or quiz doesn\'t exist'
    );
  }

  // Check if the Quiz contains any unfinished games.
  const hasActiveGame = data.activeGames.some((game: Game) => game.quizId === quizId && game.status !== 'END');
  if (hasActiveGame) {
    throw new ToohakError(
      'ACTIVE_GAME_EXISTS',
      'Any game for this quiz is not in END state'
    );
  }

  // Make sure there is a question in the quiz
  if (!targetQuiz.questions) {
    throw new ToohakError(
      'INVALID_QUESTION_ID',
      'Question Id does not refer to a valid question within this quiz'
    );
  }

  // Find the question which we want to delete
  const questionIndex = targetQuiz.questions.findIndex((q: Question) => q.questionId === questionId);
  if (questionIndex === -1) {
    throw new ToohakError(
      'INVALID_QUESTION_ID',
      'Question Id does not refer to a valid question within this quiz'
    );
  }

  // Delete the question ID and update the last edit time.
  targetQuiz.questions.splice(questionIndex, 1);
  targetQuiz.timeLastEdited = getCurrentTimestamp();

  return {};
}

/**
 * Updates an existing question within a quiz that the authenticated user owns.
 * Performs validation on the updated question's content, timing, points, answers,
 * and thumbnail according to Iteration 3 specifications.
 * Throws a ToohakError when validation fails or when the user is unauthorised.
 *
 * @param {string} sessionId - the session identifier of the logged-in user
 * @param {number} quizId - the unique identifier of the quiz containing the question
 * @param {number} questionId - the unique identifier of the question to update
 * @param {Object} questionBody - the updated details of the question
 * @param {string} questionBody.question - the new question text
 * @param {number} questionBody.timeLimit - the time limit (in seconds) for this question
 * @param {number} questionBody.points - the points awarded for this question
 * @param {Array} questionBody.answerOptions - an array of possible answers, each containing an `answer` string and `correct` boolean
 * @param {string} questionBody.thumbnailUrl - the URL of the thumbnail image for this question
 * @returns {Object} - an empty object `{}` on successful update
 */
function updateQuizQuestion(
  userId: number,
  quizId: number,
  questionId: number,
  questionBody: Question
): Record<never, never> {
  const data = getData();

  try {
    validQuizId(quizId);
  } catch {
    throw new ToohakError('INVALID_QUIZ_ID', 'Quiz does not exist');
  }

  const quiz = data.quizzes.find((q: Quiz) => q.quizId === quizId);

  if (!quiz) {
    throw new ToohakError('INVALID_QUIZ_ID', 'Quiz does not exist');
  }

  if (quiz.creatorId !== userId) {
    throw new ToohakError('INVALID_QUIZ_ID', 'Quiz not owned by user');
  }

  const question = quiz.questions.find((q: Question) => q.questionId === questionId);
  if (!question) {
    throw new ToohakError('INVALID_QUESTION_ID', 'Question not found in quiz');
  }

  const { question: newQuestion, timeLimit, points, answerOptions, thumbnailUrl } = questionBody;

  if (newQuestion.length < 5 || newQuestion.length > 50) {
    throw new ToohakError('INVALID_QUESTION', 'Question must be between 5 and 50 characters long');
  }

  if (points < 1 || points > 10) {
    throw new ToohakError('INVALID_QUESTION', 'Points must be between 1 and 10');
  }

  if (answerOptions.length < 2 || answerOptions.length > 6) {
    throw new ToohakError('INVALID_ANSWERS', 'Must have between 2 and 6 answers');
  }

  const answers = answerOptions.map(a => a.answer.trim());
  if (new Set(answers).size !== answers.length) {
    throw new ToohakError('INVALID_ANSWERS', 'Duplicate answers detected');
  }

  if (answers.some(a => a.length < 1 || a.length > 30)) {
    throw new ToohakError('INVALID_ANSWERS', 'Answers must be 1–30 characters long');
  }

  if (!answerOptions.some(a => a.correct)) {
    throw new ToohakError('INVALID_ANSWERS', 'At least one correct answer required');
  }

  if (timeLimit <= 0) {
    throw new ToohakError('INVALID_TIMELIMIT', 'Time limit must be greater than 0');
  }

  const totalOtherTime = quiz.questions
    .filter((q: Question) => q.questionId !== questionId)
    .reduce((sum: number, q: Question) => sum + q.timeLimit, 0);

  if (totalOtherTime + timeLimit > 180) {
    throw new ToohakError('INVALID_TIMELIMIT', 'Total quiz time cannot exceed 3 minutes');
  }

  const lower = thumbnailUrl.toLowerCase();
  const validExt = ['.jpg', '.jpeg', '.png'];
  if (
    thumbnailUrl === ''
    || !(lower.startsWith('http://') || lower.startsWith('https://'))
    || !validExt.some(ext => lower.endsWith(ext))
  ) {
    throw new ToohakError('INVALID_THUMBNAIL', 'Thumbnail URL invalid');
  }

  let nextAnswerId = 1;
  for (const q of quiz.questions) {
    for (const a of q.answerOptions) {
      if (a.answerId >= nextAnswerId) {
        nextAnswerId = a.answerId + 1;
      }
    }
  }

  const updatedAnswers = answerOptions.map((a, i) => ({
    answerId: nextAnswerId + i,
    answer: a.answer,
    correct: a.correct,
    colour: generateColour()
  }));

  question.question = newQuestion;
  question.timeLimit = timeLimit;
  question.points = points;
  question.answerOptions = updatedAnswers;
  question.thumbnailUrl = thumbnailUrl;

  quiz.timeLastEdited = getCurrentTimestamp();

  return {};
}

// Iteration 3

function adminQuizGames(userId: number, quizId: number): { activeGames: number[]; inactiveGames: number[] } {
  const data = getData();

  // Validate quiz
  let quiz: Quiz | undefined;
  try {
    validQuizId(quizId);
    quiz = data.quizzes.find((q: Quiz) => q.quizId === quizId);
  } catch {
    throw new ToohakError('INVALID_QUIZ_ID', 'Quiz does not exist');
  }

  if (!quiz || quiz.creatorId !== userId) {
    throw new ToohakError('INVALID_QUIZ_ID', 'Valid session is provided, but user is not an owner of this quiz, or quiz doesn\'t exist');
  }

  // Ensure activeGames array exists in dataStore
  const games: Game[] = data.activeGames || [];

  const activeGames = games
    .filter((g: Game) => g.quizId === quizId && g.status !== 'END')
    .map(g => g.gameId)
    .sort((a, b) => a - b);

  const inactiveGames = games
    .filter((g: Game) => g.quizId === quizId && g.status === 'END')
    .map(g => g.gameId)
    .sort((a, b) => a - b);

  return { activeGames, inactiveGames };
}

/**
 * Starts a new game for a given quiz.
 *
 * This function copies the quiz so that any edits made while a game is active
 * do not affect the running game instance. It also enforces the constraints on
 * maximum active games, quiz ownership, and valid autoStartNum.
 *
 * @param {int} userId user ID
 * @param {int} quizId quiz ID
 * @param {int} autoStartNum auto start number for the quiz
 * @returns {int} gameId unique ID of the newly created game
 */
function adminQuizGameStart(
  userId: number,
  quizId: number,
  autoStartNum: number
): { gameId: number } {
  const data = getData();

  try {
    validateUserId(userId);
  } catch {
    throw new ToohakError(
      'UNAUTHORISED',
      'Session is empty or invalid'
    );
  }

  // Validate quiz
  const quiz = data.quizzes.find((q: Quiz) => q.quizId === quizId);
  if (!quiz || quiz.creatorId !== userId) {
    throw new ToohakError(
      'INVALID_QUIZ_ID',
      "Valid session is provided, but user is not an owner of this quiz, or quiz doesn't exist"
    );
  }

  // Check invalid autoStartNum
  if (autoStartNum !== undefined && autoStartNum > 50) {
    throw new ToohakError('INVALID_GAME', 'autoStartNum is a number greater than 50');
  }

  // Check if quiz has any questions
  if (!quiz.questions || quiz.questions.length === 0) {
    throw new ToohakError('QUIZ_IS_EMPTY', 'The quiz does not have any questions in it');
  }

  // Check if there are already 10 active games for this quiz
  const activeGames = data.activeGames.filter(
    (g: Game) => g.quizId === quizId && g.status !== 'END'
  );
  if (activeGames.length >= 10) {
    throw new ToohakError(
      'MAX_ACTIVE_GAMES',
      '10 games that are not in END state currently exist for this quiz'
    );
  }

  // Create a new unique gameId
  let nextGameId = 1;
  for (const game of data.activeGames) {
    if (game.gameId >= nextGameId) nextGameId = game.gameId + 1;
  }

  // Create deep copy of the quiz
  const quizCopy = JSON.parse(JSON.stringify(quiz));
  quizCopy.gameId = nextGameId;

  const newGame: Game = {
    gameId: nextGameId,
    quizId,
    status: 'LOBBY',
    currentQuestionIndex: 0,
    metadata: quiz,
    timeStarted: getCurrentTimestamp(),
    timeEnded: 0,
    autoStartNum: autoStartNum ?? 0,
    playerAnswersPerQuestion: [],
    questionResults: [],
    finalResults: {
      usersRankedByScore: [],
      questionResults: [],
    },
    players: [],
    questions: quiz.questions
  };

  data.activeGames.push(newGame);

  return { gameId: nextGameId };
}

// Update a quiz game state
function adminQuizGameStateUpdate(
  userId: number,
  quizId: number,
  gameId: number,
  body: { action: string }
): object {
  const data = getData();
  const { action } = body;

  // UNAUTHORISED (401)
  try {
    validateUserId(userId);
  } catch {
    throw new ToohakError(
      'UNAUTHORISED',
      'Session is empty or invalid (does not refer to valid logged in user session)'
    );
  }

  // INVALID_QUIZ_ID (403)
  const targetQuiz = data.quizzes.find(q => q.quizId === quizId);
  if (!targetQuiz || targetQuiz.creatorId !== userId) {
    throw new ToohakError(
      'INVALID_QUIZ_ID',
      'Valid session is provided, but user is not an owner of this quiz, or quiz doesn\'t exist'
    );
  }

  // INVALID_GAME_ID (400)
  const targetGame = data.activeGames.find(g => g.gameId === gameId && g.quizId === quizId);
  if (!targetGame) {
    throw new ToohakError('INVALID_GAME_ID', 'Game does not exist in this quiz');
  }

  // INVALID_ACTION (400)
  if (!VALID_ACTIONS.includes(action as (typeof VALID_ACTIONS)[number])) {
    throw new ToohakError('INVALID_ACTION', 'Action is not valid');
  }

  // Helper to stop timer
  const clearActiveTimer = () => {
    if (timerState.activeTimerId !== null) {
      timers.clear(timerState.activeTimerId);
      timerState.activeTimerId = null;
    }
  };

  // NCOMPATIBLE_GAME_STATE (400)
  switch (action) {
    // NEXT_QUESTION
    // State diagram: LOBBY -> QUESTION_COUNTDOWN / QUESTION_CLOSE -> QUESTION_COUNTDOWN / ANSWER_SHOW -> QUESTION_COUNTDOWN
    case 'NEXT_QUESTION': {
      if (!['LOBBY', 'QUESTION_CLOSE', 'ANSWER_SHOW'].includes(targetGame.status)) {
        throw new ToohakError(
          'INCOMPATIBLE_GAME_STATE',
          'NEXT_QUESTION only allowed in LOBBY / QUESTION_OPEN / ANSWER_SHOW'
        );
      }

      const maxIdx = targetGame.questions.length - 1;
      if (targetGame.status !== 'LOBBY') {
        if (targetGame.currentQuestionIndex >= maxIdx) {
          throw new ToohakError('INCOMPATIBLE_GAME_STATE', 'No next question available');
        }
        // Advance question only when moving from QUESTION_CLOSE or ANSWER_SHOW
        targetGame.currentQuestionIndex += 1;
      }

      clearActiveTimer();

      // Advance question

      // Enter QUESTION_COUNTDOWN
      targetGame.status = 'QUESTION_COUNTDOWN';

      // 3-second countdown timer
      timerState.activeTimerId = timers.schedule(() => {
        timerState.activeTimerId = null;

        // Move to QUESTION_OPEN
        targetGame.status = 'QUESTION_OPEN';

        // start the question duration timer
        const durationMs = targetGame.questions[targetGame.currentQuestionIndex].timeLimit * 1000;
        timerState.activeTimerId = timers.schedule(() => {
          timerState.activeTimerId = null;

          // QUESTION_OPEN -> QUESTION_CLOSE
          targetGame.status = 'QUESTION_CLOSE';
        }, durationMs);
      }, 3000);

      break;
    }

    // SKIP_COUNTDOWN
    // State diagram：QUESTION_COUNTDOWN -> QUESTION_OPEN
    case 'SKIP_COUNTDOWN': {
      if (targetGame.status !== 'QUESTION_COUNTDOWN') {
        throw new ToohakError(
          'INCOMPATIBLE_GAME_STATE',
          'SKIP_COUNTDOWN only allowed in QUESTION_COUNTDOWN'
        );
      }

      clearActiveTimer();

      // Move to QUESTION_OPEN immediately
      targetGame.status = 'QUESTION_OPEN';

      // Start question duration timer
      const durationMs = targetGame.questions[targetGame.currentQuestionIndex].timeLimit * 1000;
      timerState.activeTimerId = timers.schedule(() => {
        timerState.activeTimerId = null;
        targetGame.status = 'QUESTION_CLOSE';
      }, durationMs);

      break;
    }

    // GO_TO_ANSWER
    // State diagram：QUESTION_CLOSE -> ANSWER_SHOW / QUESTION_OPEN -> ANSWER_SHOW
    case 'GO_TO_ANSWER': {
      if (!['QUESTION_CLOSE', 'QUESTION_OPEN'].includes(targetGame.status)) {
        throw new ToohakError(
          'INCOMPATIBLE_GAME_STATE',
          'GO_TO_ANSWER only allowed in QUESTION_CLOSE / QUESTION_OPEN'
        );
      }
      clearActiveTimer();
      targetGame.status = 'ANSWER_SHOW';
      break;
    }

    // GO_TO_FINAL_RESULTS
    // State diagram：QUESTION_CLOSE -> FINAL_RESULTS / ANSWER_SHOW -> FINAL_RESULTS
    case 'GO_TO_FINAL_RESULTS': {
      if (!['QUESTION_CLOSE', 'ANSWER_SHOW'].includes(targetGame.status)) {
        throw new ToohakError(
          'INCOMPATIBLE_GAME_STATE',
          'GO_TO_FINAL_RESULTS only allowed in QUESTION_CLOSE / ANSWER_SHOW'
        );
      }
      clearActiveTimer();
      targetGame.status = 'FINAL_RESULTS';
      break;
    }

    // END (from any state)
    // State diagram：any state -> END
    case 'END': {
      clearActiveTimer();
      targetGame.status = 'END';
      break;
    }
  }

  return {};
}

// Get quiz game status
function adminGetQuizGameStatus(
  userId: number,
  quizId: number,
  gameId: number
): {
  state: Game['status'];
  atQuestion: number;
  players: string[];
  metadata: {
    quizId: number;
    name: string;
    timeCreated: number;
    timeLastEdited: number;
    description: string;
    numQuestions: number;
    questions: Game['questions'];
  };
} {
  const data: Data = getData();

  // UNAUTHORISED (401)
  try {
    validateUserId(userId);
  } catch {
    throw new ToohakError(
      'UNAUTHORISED',
      'Session is empty or invalid (does not refer to valid logged in user session)'
    );
  }

  // INVALID_QUIZ_ID (403)
  const targetQuiz = data.quizzes.find(q => q.quizId === quizId);
  if (!targetQuiz || targetQuiz.creatorId !== userId) {
    throw new ToohakError(
      'INVALID_QUIZ_ID',
      'Valid session is provided, but user is not an owner of this quiz, or quiz doesn\'t exist'
    );
  }

  // INVALID_GAME_ID (400)
  const targetGame = data.activeGames.find(g => g.gameId === gameId && g.quizId === quizId);
  if (!targetGame) {
    throw new ToohakError(
      'INVALID_GAME_ID',
      'Game Id does not refer to a valid game within this quiz'
    );
  }

  return {
    state: targetGame.status,
    atQuestion: targetGame.currentQuestionIndex + 1,
    players: targetGame.players.map(p => p.playerName),
    metadata: {
      quizId: targetQuiz.quizId,
      name: targetQuiz.name,
      timeCreated: targetQuiz.timeCreated,
      timeLastEdited: targetQuiz.timeLastEdited,
      description: targetQuiz.description,
      numQuestions: targetQuiz.numQuestions,
      questions: targetGame.questions
    }
  };
}

/**
 * Get the final results for all players for a completed quiz game
 *
 * @param {number} userId - The unique identifier of the user
 * @param {number} quizId - The unique identifier of the quiz
 * @param {number} gameId - The unique identifier of the game
 * @returns {Object} - Object containing usersRankedByScore and questionResults
 * @throws {ToohakError} - If validation fails or game is not in FINAL_RESULTS state
 */
function adminGetQuizGameResults(
  userId: number,
  quizId: number,
  gameId: number
): {
  usersRankedByScore: { playerName: string; score: number }[];
  questionResults: {
    questionId: number;
    playersCorrect: string[];
    averageAnswerTime: number;
    percentCorrect: number;
  }[];
} {
  const data: Data = getData();

  // UNAUTHORISED (401)
  try {
    validateUserId(userId);
  } catch {
    throw new ToohakError(
      'UNAUTHORISED',
      'Session is empty or invalid (does not refer to valid logged in user session)'
    );
  }

  // INVALID_QUIZ_ID (403)
  const targetQuiz = data.quizzes.find(q => q.quizId === quizId);
  if (!targetQuiz || targetQuiz.creatorId !== userId) {
    throw new ToohakError(
      'INVALID_QUIZ_ID',
      'Valid session is provided, but user is not an owner of this quiz, or quiz doesn\'t exist'
    );
  }

  // INVALID_GAME_ID (400)
  const targetGame = data.activeGames.find(g => g.gameId === gameId && g.quizId === quizId);
  if (!targetGame) {
    throw new ToohakError(
      'INVALID_GAME_ID',
      'Game Id does not refer to a valid game within this quiz'
    );
  }

  // INCOMPATIBLE_GAME_STATE (400)
  if (targetGame.status !== 'FINAL_RESULTS') {
    throw new ToohakError(
      'INCOMPATIBLE_GAME_STATE',
      'Game is not in FINAL_RESULTS state'
    );
  }

  // Check if finalResults exists
  if (!targetGame.finalResults) {
    throw new ToohakError(
      'INCOMPATIBLE_GAME_STATE',
      'Game is not in FINAL_RESULTS state'
    );
  }

  // map the results to match the specs (name -> playerName)
  const usersRankedByScore = targetGame.finalResults.usersRankedByScore.map(player => ({
    playerName: player.name,
    score: player.score
  }));

  return {
    usersRankedByScore,
    questionResults: targetGame.finalResults.questionResults
  };
}

/**
 * @param playerId Id number of player
 * @returns object with game state, total number of questions and number of current question
 * @throws {ToohakError} if player not found
 */
function adminQuizGetPlayerStatusInGame(playerId: number) {
  const data = getData();
  // console.log(data);
  for (const game of data.activeGames) {
    for (const player of game.players) {
      if (player.playerId === playerId) {
        return {
          state: game.status,
          numQuestions: game.questions.length,
          atQuestion: game.currentQuestionIndex + 1,
        };
      }
    }
  }

  throw new ToohakError('INVALID_PLAYER_ID', 'player ID does not exist');
}

export function adminQuizGuestJoinGame(gameId: number, playerName: string): { playerId: number } {
  try {
    const game = findGame(gameId, 'active') as Game;
    if (game.status !== 'LOBBY') {
      throw new ToohakError('INCOMPATIBLE_GAME_STATE', 'Game is not in LOBBY state');
    }
    for (const player of game.players) {
      if (player.playerName === playerName) {
        throw new ToohakError('INVALID_PLAYER_NAME', 'name already exist');
      }
    }
  } catch (error) {
    if (error instanceof ToohakError) {
      throw error;
    }
  }

  if (playerName.length === 0 || playerName === undefined || playerName === null) {
    do {
      playerName = cryptoRandomString({ length: 5, characters: 'abcdefghijklmnopqrstuvwxyz' }) + cryptoRandomString({ length: 3, type: 'numeric' });
    } while ((() => {
      let count = 0;
      for (const ch of playerName) {
        for (const find of playerName) {
          if (ch === find) {
            count++;
          }
        }
        if (count > 1) {
          return true;
        }
        count = 0;
      }
      return false;
    })());
  } else {
    for (const ch of playerName) {
      if (!(ch >= 'a' && ch <= 'z') && !(ch >= 'A' && ch <= 'Z') && !(ch >= '0' && ch <= '9') && ch !== ' ') {
        throw new ToohakError('INVALID_PLAYER_NAME', 'Name contains invalid characters. Valid characters are alphanumeric and spaces.');
      }
    }
  };

  const game = findGame(gameId, 'active');
  const newPlayer: Player = {
    playerId: game.players.length + 1,
    playerName: playerName,
    gameId: gameId
  };
  game.players.push(newPlayer);

  return {
    playerId: newPlayer.playerId
  };
}

export function playerQuestionAnswer(answerIds: number[], playerid: number, questionPosition: number) {
  if (questionPosition < 1) {
    throw new ToohakError('INVALID_POSITION', 'Question position is not valid for this game');
  }

  const game: Game = findGameFromPlayer(playerid);

  if (questionPosition > game.questions.length) {
    throw new ToohakError('INVALID_POSITION', 'Question position is not valid for this game');
  }

  const currentQuestionIndex = game.currentQuestionIndex;
  if (currentQuestionIndex + 1 !== questionPosition) {
    throw new ToohakError('INVALID_POSITION', 'Game is not currently on this question');
  }

  if (game.status !== 'QUESTION_OPEN') {
    throw new ToohakError('INCOMPATIBLE_GAME_STATE', 'Game is not in QUESTION_OPEN state');
  }

  const currentQuestion = game.questions[currentQuestionIndex];

  if (answerIds.length < 1) {
    throw new ToohakError('INVALID_ANSWER_IDS', 'At least one answer ID must be submitted');
  }

  const uniqueAnswerIds = new Set(answerIds);
  if (uniqueAnswerIds.size !== answerIds.length) {
    throw new ToohakError('INVALID_ANSWER_IDS', 'Duplicate answer IDs provided');
  }

  const validAnswerIds = currentQuestion.answerOptions.map(answer => answer.answerId);
  const invalidAnswers = answerIds.filter(id => !validAnswerIds.includes(id));
  if (invalidAnswers.length > 0) {
    throw new ToohakError('INVALID_ANSWER_IDS', 'One or more answer IDs are not valid for this question');
  }

  let questionAnswers = game.playerAnswersPerQuestion.find(
    qa => qa.questionId === currentQuestion.questionId
  );

  if (!questionAnswers) {
    questionAnswers = {
      questionId: currentQuestion.questionId,
      submissions: [],
      questionStartTime: Date.now()
    };
    game.playerAnswersPerQuestion.push(questionAnswers);
  }

  const existingSubmissionIndex = questionAnswers.submissions.findIndex(
    submission => submission.playerId === playerid
  );

  const currentTime = Math.floor(Date.now() / 1000);

  const correctAnswerIds = currentQuestion.answerOptions.filter(answer => answer.correct).map(answer => answer.answerId);

  const isCorrect = correctAnswerIds.length === answerIds.length && correctAnswerIds.every(id => answerIds.includes(id));

  const pointsAwarded = isCorrect ? currentQuestion.points : 0;

  const playerAnswer = {
    playerId: playerid,
    answerIds: answerIds,
    submittedAt: currentTime,
    isCorrect: isCorrect,
    pointsAwarded: pointsAwarded
  };

  if (existingSubmissionIndex >= 0) {
    questionAnswers.submissions[existingSubmissionIndex] = playerAnswer;
  } else {
    questionAnswers.submissions.push(playerAnswer);
  }
  return {};
}

export function getPlayerQuestionInfo(playerid: number, questionposition: number): {
  questionId: number;
  question: string;
  timeLimit: number;
  thumbnailUrl: string;
  points: number;
  answerOptions: {
    answerId: number;
    answer: string;
    colour: string;
  }[];
} {
  const targetGame = findGameFromPlayer(playerid);

  if (questionposition < 1 || questionposition > targetGame.questions.length) {
    throw new ToohakError('INVALID_POSITION', 'Question position is not valid for the game this player is in');
  }

  const currentQuestionIndex = targetGame.currentQuestionIndex;
  if (currentQuestionIndex + 1 !== questionposition) {
    throw new ToohakError('INVALID_POSITION', 'Game is not currently on this question');
  }

  const incompatibleStates = ['LOBBY', 'QUESTION_COUNTDOWN', 'FINAL_RESULTS', 'END'];
  if (incompatibleStates.includes(targetGame.status)) {
    throw new ToohakError('INCOMPATIBLE_GAME_STATE', 'Game is not in a state where question information can be retrieved');
  }

  // Get the question
  const question = targetGame.questions[questionposition - 1];

  return {
    questionId: question.questionId,
    question: question.question,
    timeLimit: question.timeLimit,
    thumbnailUrl: question.thumbnailUrl,
    points: question.points,
    answerOptions: question.answerOptions.map(answer => ({
      answerId: answer.answerId,
      answer: answer.answer,
      colour: answer.colour
    }))
  };
}

/**
 * Get the results for a particular question of the game a player is playing in
 *
 * @param {number} userId - The id of the player
 * @param {number} questionPosition - The position of the question (starts at 1)
 * @returns {Object} - object containing questionId, playersCorrect, averageAnswerTime, percentCorrect
 * @throws {ToohakError} - if it fails
 */
function getPlayerQuestionResults(userId: number, questionPosition: number): {
  questionId: number;
  playersCorrect: string[];
  averageAnswerTime: number;
  percentCorrect: number;
} {
  const targetGame = findGameFromPlayer(userId);

  // INCOMPATIBLE_GAME_STATE: game must be in the ANSWER_SHOW state
  if (targetGame.status !== 'ANSWER_SHOW') {
    throw new ToohakError(
      'INCOMPATIBLE_GAME_STATE',
      'Game is not in ANSWER_SHOW state'
    );
  }

  // INVALID_POSITION: the question position isnt valid for the game
  if (questionPosition < 1 || questionPosition > targetGame.questions.length) {
    throw new ToohakError(
      'INVALID_POSITION',
      'Question position is not valid for the game this player is in'
    );
  }

  // INVALID_POSITION: game is not currently on this question
  const currentQuestionIndex = targetGame.currentQuestionIndex;
  if (currentQuestionIndex + 1 !== questionPosition) {
    throw new ToohakError(
      'INVALID_POSITION',
      'Game is not currently on this question'
    );
  }

  // get the question to find its questionId
  const question = targetGame.questions[questionPosition - 1];
  const questionId = question.questionId;

  // find the questionResults entry for the question
  const questionResult = targetGame.questionResults.find(qr => qr.questionId === questionId);

  if (!questionResult) {
    // if no results exist yet, return default values
    return {
      questionId: questionId,
      playersCorrect: [],
      averageAnswerTime: 0,
      percentCorrect: 0
    };
  }

  return {
    questionId: questionResult.questionId,
    playersCorrect: questionResult.playersCorrect,
    averageAnswerTime: questionResult.averageAnswerTime,
    percentCorrect: questionResult.percentCorrect
  };
}

/**
 * Get the final results for a whole game a player is playing in
 *
 * @param {number} playerId - The id of the player
 * @returns {Object} - object containing usersRankedByScore and questionResults
 * @throws {ToohakError} - if it fails
 */
function getPlayerFinalResults(playerId: number): {
  usersRankedByScore: {
    playerName: string;
    score: number;
  }[];
  questionResults: {
    questionId: number;
    playersCorrect: string[];
    averageAnswerTime: number;
    percentCorrect: number;
  }[];
} {
  const targetGame = findGameFromPlayer(playerId);

  // INCOMPATIBLE_GAME_STATE: game must be in FINAL_RESULTS state
  if (targetGame.status !== 'FINAL_RESULTS') {
    throw new ToohakError(
      'INCOMPATIBLE_GAME_STATE',
      'Game is not in FINAL_RESULTS state'
    );
  }

  // init map to store player scores (better for efficiency)
  const playerScores: Map<number, number> = new Map();
  for (const player of targetGame.players) {
    playerScores.set(player.playerId, 0);
  }

  // calculate the player scores by summing the points awarded from all questions
  for (const questionAnswers of targetGame.playerAnswersPerQuestion) {
    for (const submission of questionAnswers.submissions) {
      const currentScoreValue = playerScores.get(submission.playerId);
      let currentScore = 0;
      if (currentScoreValue !== undefined) {
        currentScore = currentScoreValue;
      }

      const newScore = currentScore + submission.pointsAwarded;
      playerScores.set(submission.playerId, newScore);
    }
  }

  // convert player scores to an array
  const usersRankedByScore: { playerName: string; score: number }[] = [];
  for (const player of targetGame.players) {
    const scoreValue = playerScores.get(player.playerId);
    let score = 0;
    if (scoreValue !== undefined) {
      score = scoreValue;
    }

    usersRankedByScore.push({
      playerName: player.playerName,
      score: score
    });
  }

  // sort players by score and then alphabetically
  usersRankedByScore.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return a.playerName.localeCompare(b.playerName);
  });

  let questionResults: {
    questionId: number;
    playersCorrect: string[];
    averageAnswerTime: number;
    percentCorrect: number;
  }[] = [];

  if (targetGame.questionResults.length > 0) {
    questionResults = targetGame.questionResults;
  } else {
    for (const question of targetGame.questions) {
      const questionAnswers = targetGame.playerAnswersPerQuestion.find(
        qa => qa.questionId === question.questionId
      );

      if (!questionAnswers || questionAnswers.submissions.length === 0) {
        questionResults.push({
          questionId: question.questionId,
          playersCorrect: [],
          averageAnswerTime: 0,
          percentCorrect: 0
        });
        continue;
      }

      const correctSubmissions = questionAnswers.submissions.filter(s => s.isCorrect);

      const playersCorrect: string[] = [];
      for (const submission of correctSubmissions) {
        const player = targetGame.players.find(p => p.playerId === submission.playerId);
        if (player !== undefined) {
          playersCorrect.push(player.playerName);
        }
      }

      const totalSubmissions = questionAnswers.submissions.length;
      let percentCorrect = 0;
      if (totalSubmissions > 0) {
        const correctCount = correctSubmissions.length;
        percentCorrect = Math.round((correctCount / totalSubmissions) * 100);
      }

      // calculate the average time taken to answer a question
      let totalTime = 0;
      for (const submission of questionAnswers.submissions) {
        const questionStartTimeSeconds = Math.floor(questionAnswers.questionStartTime / 1000);
        const timeTaken = submission.submittedAt - questionStartTimeSeconds;
        totalTime = totalTime + timeTaken;
      }

      let averageAnswerTime = 0;
      if (totalSubmissions > 0) {
        averageAnswerTime = Math.round(totalTime / totalSubmissions);
      }

      questionResults.push({
        questionId: question.questionId,
        playersCorrect: playersCorrect,
        averageAnswerTime: averageAnswerTime,
        percentCorrect: percentCorrect
      });
    }
  }

  return {
    usersRankedByScore,
    questionResults: questionResults
  };
}

export { adminQuizList, adminQuizCreate, adminQuizRemove, adminQuizInfo, adminQuizNameUpdate, adminQuizDescriptionUpdate, updateThumbnail, deleteQuizQuestion, updateQuizQuestion, adminQuizQuestionCreate, adminQuizGames, adminQuizGameStart, adminQuizGameStateUpdate, adminQuizGetPlayerStatusInGame, adminGetQuizGameStatus, adminGetQuizGameResults, getPlayerQuestionResults, getPlayerFinalResults };
