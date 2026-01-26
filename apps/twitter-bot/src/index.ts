import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
import { TwitterApi } from 'twitter-api-v2';

dotenv.config();

const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_TWEET_LENGTH = 280;

type Result<T> = { ok: true; value: T } | { ok: false; error: Error };

function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

function err<T>(error: Error): Result<T> {
  return { ok: false, error };
}

function getEnvVar(name: string): Result<string> {
  const value = process.env[name];
  if (!value) {
    return err(new Error(`Missing required environment variable: ${name}`));
  }
  return ok(value);
}

function initializeTwitterClient(): Result<TwitterApi> {
  const appKeyResult = getEnvVar('TWITTER_APP_KEY');
  if (!appKeyResult.ok) return appKeyResult;

  const appSecretResult = getEnvVar('TWITTER_APP_SECRET');
  if (!appSecretResult.ok) return appSecretResult;

  const accessTokenResult = getEnvVar('TWITTER_ACCESS_TOKEN');
  if (!accessTokenResult.ok) return accessTokenResult;

  const accessSecretResult = getEnvVar('TWITTER_ACCESS_SECRET');
  if (!accessSecretResult.ok) return accessSecretResult;

  try {
    const client = new TwitterApi({
      appKey: appKeyResult.value,
      appSecret: appSecretResult.value,
      accessToken: accessTokenResult.value,
      accessSecret: accessSecretResult.value,
    });
    return ok(client);
  } catch (error) {
    return err(error instanceof Error ? error : new Error('Failed to initialize Twitter client'));
  }
}

async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<Result<T>> {
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1) {
        console.log(`${operationName} succeeded on attempt ${attempt}`);
      }
      return ok(result);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      const message = errorObj.message.toLowerCase();

      if (message.includes('429') || message.includes('too many requests')) {
        console.log(`${operationName}: Rate limited`);
        return err(new Error('Rate limit hit. Aborting.'));
      }

      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delay = INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1);
        console.log(
          `${operationName}: Attempt ${attempt}/${MAX_RETRY_ATTEMPTS} failed. Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.log(`${operationName}: All ${MAX_RETRY_ATTEMPTS} attempts failed`);
        return err(errorObj);
      }
    }
  }
  return err(new Error(`${operationName} failed unexpectedly`));
}

async function fetchFormattedPoem(): Promise<Result<string>> {
  return await withRetry(async () => {
    const res = await fetch('https://api.qafiyah.com/poems/random');
    if (!res.ok) {
      throw new Error(`API returned status ${res.status}`);
    }

    const text = await res.text();
    if (!text || text.trim().length === 0) {
      throw new Error('Empty poem returned from API');
    }

    const trimmedText = text.trim();
    if (trimmedText.length > MAX_TWEET_LENGTH) {
      throw new Error(`Poem too long for Twitter (${trimmedText.length}/${MAX_TWEET_LENGTH})`);
    }

    return trimmedText;
  }, 'Fetch poem');
}

async function postTweet(twitterClient: TwitterApi, content: string): Promise<Result<string>> {
  return await withRetry(async () => {
    const response = await twitterClient.v2.tweet(content);
    if (!response?.data?.id) {
      throw new Error('Invalid response from Twitter API');
    }
    return response.data.id;
  }, 'Post tweet');
}

async function run(): Promise<void> {
  console.log('Starting poem bot...');

  const clientResult = initializeTwitterClient();
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

run();
