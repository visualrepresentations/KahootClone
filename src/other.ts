import { getData } from './dataStore';

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
  quizId: number;
  name: string;
  creatorId: number;
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
  activeQuizzes: never[];
  activeGames: never[];
  users: User[];
  quizzes: Quiz[];
  sessions: Session[];
}

/**
  * Function to clear game state
  *
  * @returns {} - return nothing
  *
  */
function clear(): unknown {
  // Reset data state
  const data = getData() as unknown as Data;
  data.users = [];
  data.quizzes = [];
  data.sessions = [];
  data.activeGames = [];

  return {};
}

export { clear };
