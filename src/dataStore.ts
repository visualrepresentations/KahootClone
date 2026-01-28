import { Data } from './interfaces';
import fs from 'fs';
import { TimerId, downtimer } from 'downtimer';

// YOU MAY MODIFY THIS OBJECT BELOW
let data: Data = {
  users: [],
  quizzes: [],
  sessions: [],
  activeGames: [],
  inactiveGames: []
};

// YOU MAY MODIFY THIS OBJECT ABOVE

// YOU SHOULDNT NEED TO MODIFY THE FUNCTIONS BELOW IN ITERATION 1

/*
Example usage
  let store = getData()
  console.log(store) # Prints { 'names': ['Hayden', 'Tam', 'Rani', 'Giuliana', 'Rando'] }

  store.names.pop() // Removes the last name from the names array
  store.names.push('Jake') // Adds 'Jake' to the end of the names array

  console.log(store) # Prints { 'names': ['Hayden', 'Tam', 'Rani', 'Giuliana', 'Jake'] }
*/

// Use getData() to access the data
const filePath = 'src/data.json';

function getData(): Data {
  return data;
}

export function loadData() {
  if (!fs.existsSync(filePath)) {
    const dataString = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, dataString);
  } else {
    const dataJson = fs.readFileSync(filePath, 'utf-8');
    if (!dataJson.trim()) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return;
    }
    data = JSON.parse(dataJson);
  }
}

export function saveData() {
  const json = JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, json);
}

export const timers = downtimer({
  logConfig: {
    schedule: 'minimal',
    clear: {
      notFound: 'full',
    },
  },
});

export const timerState = {
  activeTimerId: null as TimerId | null
};

export { getData };
