export interface User {
  userId: number;
  nameFirst: string;
  nameLast: string;
  email: string;
  password: string;
  previousPasswords: string[];
  numSuccessfulLogins: number;
  numFailedPasswordsSinceLastLogin: number;
}

export interface Quiz {
  creatorId: number;
  quizId: number;
  name: string;
  timeCreated: number;
  timeLastEdited: number;
  description: string;
  numQuestions: number;
  questions: Question[];
  timeLimit: number;
  thumbnailUrl: string;
  gameId: number;
}

export interface Session {
  sessionId: string;
  userId: number;
  createdAt: number;
  lastAccessed: number;
}

export interface ErrorResponse {
  error: string;
  message: string;
}

export interface Question {
  questionId: number;
  question: string;
  timeLimit: number;
  points: number;
  answerOptions: Answer[];
  thumbnailUrl: string;
}

export interface QuestionBody {
  question: string;
  timeLimit: number;
  points: number;
  thumbnailUrl: string;
  answerOptions: AnswerOption[];
}

export interface AnswerOption {
  answer: string;
  correct: boolean;
}

export enum Colour {
  red = 'red',
  blue = 'blue',
  green = 'green',
  yellow = 'yellow',
  purple = 'purple',
  pink = 'pink',
  orange = 'orange'
}

export interface Answer {
  answer: string;
  correct: boolean;
  colour: string;
  answerId: number;
}

export interface Data {
  users: User[];
  quizzes: Quiz[];
  sessions: Session[];
  activeGames: Game[];
  inactiveGames: Game[];
}

export interface Game {
  gameId: number;
  quizId: number;
  questions: Question[];
  status: states;
  currentQuestionIndex: number;
  metadata: Quiz;
  timeStarted: number;
  timeEnded: number;
  autoStartNum: number;
  playerAnswersPerQuestion: QuestionAnswers[];
  questionResults: QuestionResults[];
  finalResults?: ResultsFinal;
  players: Player[];
}

export interface playerAnswer {
  playerId: number;
  answerIds: number[];
  submittedAt: number;
  isCorrect: boolean;
  pointsAwarded: number;
}

export interface QuestionAnswers {
  questionId: number;
  submissions: playerAnswer[];
  questionStartTime: number;
}

export interface QuestionResults {
  questionId: number;
  playersCorrect: string[];
  averageAnswerTime: number;
  percentCorrect: number;
}

export interface ResultsFinal {
  usersRankedByScore: PlayerScore[];
  questionResults: QuestionResults[];
}

export interface PlayerScore {
  name: string;
  score: number;
}

export interface Player {
  playerId: number;
  playerName: string;
  gameId: number;
}

export type states = 'LOBBY' | 'QUESTION_COUNTDOWN' | 'QUESTION_OPEN' | 'QUESTION_CLOSE' | 'ANSWER_SHOW' | 'FINAL_RESULTS' | 'END';

export const VALID_ACTIONS = [
  'NEXT_QUESTION',
  'SKIP_COUNTDOWN',
  'GO_TO_ANSWER',
  'GO_TO_FINAL_RESULTS',
  'END'
] as const;
