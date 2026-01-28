You may copy the template below multiple times, depending on how many features were created within your group.

**Make sure this file is in Master by the end of iteration 3. We will not look elsewhere.**

# Feature A
This feature allows users to AI generate questions and their answers, allowing for the easy creation of questions. In the UI, this feature could appear as a simple "Add an AI Generated question". When clicked, the server randomly generates a number of questions, feeds it into the google ai api, and generates a topic and that many questions. Then, it calls the adminQuizQuestionCreate function to create the quiz. Unfortunately due to free API key restrictions, there is a limited amount of times you can run the script.

## Contributor(s):
* z5688474, Maxim Lebedev

Everyone listed in this section must have worked on the feature substantially

## Video URL:
https://unsw-my.sharepoint.com/:w:/g/personal/z5688474_ad_unsw_edu_au/EWkAFE-BRlBMpLh5CJQGbV8BpynsxjQk8PI7hgY74z8cUw?e=ofteQC

Please ensure this video has "Anyone with the link" access settings

## Link to branch containing the code/documentation:
https://nw-syd-gitlab.cseunsw.tech/COMP1531/25t3/groups/F14A_EAGLE/project-backend/-/tree/iter/parta/ai


# Feature B
This feature adds a new option for admins to download the final results of a completed quiz as a CSV file. In the UI, this could appear as a simple “Download Results (CSV)” button on the final results screen, similar to how Google Forms and Kahoot present export options. When clicked, the admin receives a CSV file containing quiz metadata, player performance, correctness, and scores. The export supports two views: a detailed view (one row per question per player) and a summary view (one row per player). This makes it easy for teachers or presenters to save, analyse, or archive quiz results. 

## Contributor(s):
* z5688335, Brian

Everyone listed in this section must have worked on the feature substantially

## Video URL:
https://unsw-my.sharepoint.com/:v:/g/personal/z5688335_ad_unsw_edu_au/Ee-N_fZHMPpGuerFwtIRhVsBybInCwNsd3NsZAv033cpJQ?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJPbmVEcml2ZUZvckJ1c2luZXNzIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXciLCJyZWZlcnJhbFZpZXciOiJNeUZpbGVzTGlua0NvcHkifX0&e=7d4qEl

Please ensure this video has "Anyone with the link" access settings

## Link to branch containing the code/documentation:
https://nw-syd-gitlab.cseunsw.tech/COMP1531/25t3/groups/F14A_EAGLE/project-backend/-/tree/iter/partb/csv