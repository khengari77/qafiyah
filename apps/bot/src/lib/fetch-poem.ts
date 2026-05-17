import { API_RANDOM_POEM_PATH, PROD_API_URL } from '@qafiyah/constants';
import { MAX_TWEET_LENGTH } from '../constants';
import { type Result, TerminalError } from './result';
import { withRetry } from './retry';

export async function fetchFormattedPoem(): Promise<Result<string>> {
  return await withRetry(async () => {
    const res = await fetch(`${PROD_API_URL}${API_RANDOM_POEM_PATH}?option=lines`);
    if (!res.ok) {
      throw new Error(`API returned status ${res.status}`);
    }

    const text = await res.text();
    if (!text || text.trim().length === 0) {
      throw new TerminalError('Empty poem returned from API');
    }

    const trimmedText = text.trim();
    if (trimmedText.length > MAX_TWEET_LENGTH) {
      throw new TerminalError(
        `Poem too long for Twitter (${trimmedText.length}/${MAX_TWEET_LENGTH})`
      );
    }

    return trimmedText;
  }, 'Fetch poem');
}
