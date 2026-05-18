import { API_RANDOM_POEM_PATH, MAX_TWEET_LENGTH, PROD_API_URL } from '@qafiyah/constants';
import { TwitterApi } from 'twitter-api-v2';
import { env } from './env';
import { TerminalError, withRetry } from './retry';

const POEM_FORMAT_OPTION = 'lines';

async function fetchPoem(): Promise<string> {
  const res = await fetch(`${PROD_API_URL}${API_RANDOM_POEM_PATH}?option=${POEM_FORMAT_OPTION}`);
  if (res.status === 429) throw new TerminalError('Rate limited by API');
  if (!res.ok) throw new Error(`API returned status ${res.status}`);

  const poem = (await res.text()).trim();
  if (!poem) throw new TerminalError('Empty poem returned from API');
  if (poem.length > MAX_TWEET_LENGTH) {
    throw new TerminalError(`Poem too long for Twitter (${poem.length}/${MAX_TWEET_LENGTH})`);
  }
  return poem;
}

async function postTweet(client: TwitterApi, content: string): Promise<string> {
  const response = await client.v2.tweet(content);
  if (!response?.data?.id) throw new Error('Invalid response from Twitter API');
  return response.data.id;
}

async function main(): Promise<void> {
  console.log('Starting poem bot...');

  const client = new TwitterApi({
    appKey: env.TWITTER_APP_KEY,
    appSecret: env.TWITTER_APP_SECRET,
    accessToken: env.TWITTER_ACCESS_TOKEN,
    accessSecret: env.TWITTER_ACCESS_SECRET,
  });

  const poem = await withRetry(fetchPoem, 'Fetch poem');
  console.log(`Poem ready (${poem.length}/${MAX_TWEET_LENGTH} chars)`);

  const id = await withRetry(() => postTweet(client, poem), 'Post tweet');
  console.log(`Successfully tweeted! ID: ${id}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
