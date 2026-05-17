import { TwitterApi } from 'twitter-api-v2';
import { err, ok, type Result } from './result';
import { withRetry } from './retry';

type TwitterCreds = {
  readonly appKey: string;
  readonly appSecret: string;
  readonly accessToken: string;
  readonly accessSecret: string;
};

export function initializeTwitterClient(creds: TwitterCreds): Result<TwitterApi> {
  try {
    return ok(new TwitterApi(creds));
  } catch (error) {
    return err(error instanceof Error ? error : new Error('Failed to initialize Twitter client'));
  }
}

export async function postTweet(
  twitterClient: TwitterApi,
  content: string
): Promise<Result<string>> {
  return await withRetry(async () => {
    const response = await twitterClient.v2.tweet(content);
    if (!response?.data?.id) {
      throw new Error('Invalid response from Twitter API');
    }
    return response.data.id;
  }, 'Post tweet');
}
