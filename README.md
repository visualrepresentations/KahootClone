# KahootClone
Questionably-named quiz tool that allows admins to create quiz games, and players to join (without signing up) to participate and compete.

Toohak is a RESTful backend that supports an online quiz platform. Admins can register and log in. Each successful login creates a session identifier, which must be sent in the request headers for all protected routes. Every request checks that session, updates its last-used timestamp, and rejects it if it’s invalid or expired. 

Toohak supports administrator authentication via session-based login. Users can register, log in, and log out, with each successful login generating a session identifier that must be supplied in HTTP headers for all protected routes. Sessions are validated on every request and updated with last-access timestamps to simulate expiry behaviour.

Authenticated admins can create and manage quizzes that they own. This includes:
Creating quizzes with metadata (name, description)
Listing all quizzes owned by the logged-in admin
Updating quiz names and descriptions
Deleting quizzes
Viewing quiz details and statistics

Each quiz maintains derived metadata such as the number of questions, total time limits, and last-edited timestamps, all of which are updated automatically when the quiz is modified.

Each quiz contains a collection of questions, and admins can fully manage these questions:
Add new questions with configurable time limits and point values
Define multiple answer options per question
Mark exactly one correct answer
Update or delete existing questions
Automatically update quiz-level metadata when questions change

Toohak supports importing questions from a public trivia API (Open Trivia Database). Admins can dynamically populate quizzes with externally sourced questions by specifying filters such as difficulty, category, and question type. Imported questions are normalised into Toohak’s internal schema, ensuring consistency with manually authored content.

Toohak is developed using a black-box testing philosophy. All tests interact with the server exclusively through HTTP requests, without direct access to internal state.
