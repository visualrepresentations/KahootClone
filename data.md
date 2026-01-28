const data = {
  users: [
    {
      userId: 1,
      nameFirst: 'bob',
      nameLast: 'bobbington',
      email: 'bob@gmail.com',
      password: '67676767',
      previousPasswords: ['67', '676', '6767'],
      numSuccessfulLogins: 67,
      numFailedPasswordsSinceLastLogin: 67,
    }
  ],
  quizzes: [
{
  quizId: 5546,
  name: "This is the name of the quiz",
  timeCreated: 1683019484,
  timeLastEdited: 1683019484,
  description: "This quiz is so we can have a lot of fun",
  numQuestions: 1,
  questions: [
    {
      questionId: 5546,
      question: "Who is the Monarch of England?",
      timeLimit: 4,
      thumbnailUrl: "http://google.com/some/image/path.jpg",
      points: 5,
      answerOptions: [
        {
          answerId: 2384,
          answer: "Prince Charles",
          colour: "red",
          correct: true
        }
      ]
    }
  ],
  timeLimit: 4,
  thumbnailUrl: "http://google.com/some/image/path.jpg"
}
  ],
    sessions: [
      {
        sessionId: "23748",
        userId: 1,
        createdAt: 1683019484,
        lastAccessed: 1683023084
      }
    ],
};
