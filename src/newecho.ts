// Do not delete this file
import { ToohakError } from './toohakError';

type ErrorMsg = {
  error: string;
  message: string;
};

function echo(value: string): { value: string } | ErrorMsg {
  if (value === 'echo') {
    throw new ToohakError('INVALID_ECHO', 'You cannot echo the word echo itself');
  }

  return {
    value,
  };
}

export { echo };
