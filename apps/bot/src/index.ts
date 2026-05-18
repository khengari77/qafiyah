import { API_RANDOM_POEM_PATH, MAX_TWEET_LENGTH, PROD_API_URL } from '@qafiyah/constants';
import { err, ok, type Result, ResultAsync } from 'neverthrow';
import { TwitterApi } from 'twitter-api-v2';
import { env } from './env';
import { withRetry } from './retry';

const POEM_RESPONSE_FORMAT = 'lines';

type FetchPoemError =
  | {
      readonly kind: 'network';
      readonly url: string;
      readonly message: string;
      readonly retryable: true;
    }
  | { readonly kind: 'rate_limited'; readonly url: string; readonly retryable: false }
  | {
      readonly kind: 'http_error';
      readonly url: string;
      readonly status: number;
      readonly retryable: true;
    }
  | { readonly kind: 'empty_response'; readonly url: string; readonly retryable: false }
  | {
      readonly kind: 'too_long';
      readonly url: string;
      readonly length: number;
      readonly max: number;
      readonly retryable: false;
    };

type PostTweetError =
  | { readonly kind: 'network'; readonly message: string; readonly retryable: true }
  | {
      readonly kind: 'invalid_response';
      readonly contentLength: number;
      readonly responseShape: string;
      readonly retryable: true;
    };

async function fetchPoem(): Promise<Result<string, FetchPoemError>> {
  const url = `${PROD_API_URL}${API_RANDOM_POEM_PATH}?option=${POEM_RESPONSE_FORMAT}`;
  const fetchResult = await ResultAsync.fromPromise(
    fetch(url),
    (cause): FetchPoemError => ({
      kind: 'network',
      url,
      message: cause instanceof Error ? cause.message : String(cause),
      retryable: true,
    })
  );
  if (fetchResult.isErr()) return err(fetchResult.error);
  const response = fetchResult.value;
  if (response.status === 429) return err({ kind: 'rate_limited', url, retryable: false });
  if (!response.ok) {
    return err({ kind: 'http_error', url, status: response.status, retryable: true });
  }
  const poem = (await response.text()).trim();
  if (!poem) return err({ kind: 'empty_response', url, retryable: false });
  if (poem.length > MAX_TWEET_LENGTH) {
    return err({
      kind: 'too_long',
      url,
      length: poem.length,
      max: MAX_TWEET_LENGTH,
      retryable: false,
    });
  }
  return ok(poem);
}

async function postTweet(
  client: TwitterApi,
  content: string
): Promise<Result<string, PostTweetError>> {
  const tweetResult = await ResultAsync.fromPromise(
    client.v2.tweet(content),
    (cause): PostTweetError => ({
      kind: 'network',
      message: cause instanceof Error ? cause.message : String(cause),
      retryable: true,
    })
  );
  if (tweetResult.isErr()) return err(tweetResult.error);
  const response = tweetResult.value;
  if (!response?.data?.id) {
    return err({
      kind: 'invalid_response',
      contentLength: content.length,
      responseShape: JSON.stringify(response ?? null),
      retryable: true,
    });
  }
  return ok(response.data.id);
}

async function main(): Promise<number> {
  console.log('Starting poem bot...');

  const client = new TwitterApi({
    appKey: env.TWITTER_APP_KEY,
    appSecret: env.TWITTER_APP_SECRET,
    accessToken: env.TWITTER_ACCESS_TOKEN,
    accessSecret: env.TWITTER_ACCESS_SECRET,
  });

  const poemResult = await withRetry(fetchPoem, 'Fetch poem');
  if (poemResult.isErr()) {
    console.error(JSON.stringify({ source: 'bot', stage: 'fetch_poem', error: poemResult.error }));
    return 1;
  }
  const poem = poemResult.value;
  console.log(`Poem ready (${poem.length}/${MAX_TWEET_LENGTH} chars)`);

  const tweetResult = await withRetry(() => postTweet(client, poem), 'Post tweet');
  if (tweetResult.isErr()) {
    console.error(
      JSON.stringify({
        source: 'bot',
        stage: 'post_tweet',
        poemLength: poem.length,
        error: tweetResult.error,
      })
    );
    return 1;
  }
  console.log(`Successfully tweeted! ID: ${tweetResult.value}`);
  return 0;
}

main()
  .then((exitCode) => process.exit(exitCode))
  .catch((cause) => {
    console.error(
      JSON.stringify({
        source: 'bot',
        stage: 'main',
        message: cause instanceof Error ? cause.message : String(cause),
        name: cause instanceof Error ? cause.name : undefined,
      })
    );
    process.exit(1);
  });
