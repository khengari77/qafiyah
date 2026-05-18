import { MAX_TWEET_LENGTH } from '@qafiyah/constants';
import { env } from '@/env';
import { fetchFormattedPoem } from './fetch-poem';
import { initializeTwitterClient, postTweet } from './twitter';

export async function run(): Promise<void> {
  console.log('Starting poem bot...');

  const clientResult = initializeTwitterClient({
    appKey: env.TWITTER_APP_KEY,
    appSecret: env.TWITTER_APP_SECRET,
    accessToken: env.TWITTER_ACCESS_TOKEN,
    accessSecret: env.TWITTER_ACCESS_SECRET,
  });
  if (!clientResult.ok) {
    console.error(`Setup failed: ${clientResult.error.message}`);
    process.exit(1);
  }

  console.log('Twitter client initialized');
  const twitterClient = clientResult.value;

  const poemResult = await fetchFormattedPoem();
  if (!poemResult.ok) {
    console.error(`Failed to fetch poem: ${poemResult.error.message}`);
    process.exit(1);
  }

  const poem = poemResult.value;
  console.log(`Poem ready (${poem.length}/${MAX_TWEET_LENGTH} chars)`);

  const tweetResult = await postTweet(twitterClient, poem);
  if (!tweetResult.ok) {
    console.error(`Failed to post tweet: ${tweetResult.error.message}`);
    process.exit(1);
  }

  console.log(`Successfully tweeted! ID: ${tweetResult.value}`);
  process.exit(0);
}
