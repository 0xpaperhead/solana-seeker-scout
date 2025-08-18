import axios, { AxiosInstance } from 'axios';

interface TwitterUser {
  id: string;
  username: string;
  name: string;
  followers_count: number;
  following_count: number;
  verified: boolean;
}

interface Tweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  username?: string;
  name?: string;
}

interface SearchResult {
  tweets: Tweet[];
  next_token?: string;
}

export class TwitterClient {
  private axiosInstance: AxiosInstance;
  private requestCount: number = 0;
  private lastRequestTime: number = Date.now();
  private readonly maxRequestsPerMinute: number = 30;

  constructor(apiKey: string) {
    this.axiosInstance = axios.create({
      baseURL: 'https://twitter241.p.rapidapi.com',
      headers: {
        'x-rapidapi-host': 'twitter241.p.rapidapi.com',
        'x-rapidapi-key': apiKey
      }
    });
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeDiff = now - this.lastRequestTime;
    
    if (timeDiff < 60000) {
      this.requestCount++;
      if (this.requestCount >= this.maxRequestsPerMinute) {
        const waitTime = 60000 - timeDiff;
        console.log(`Rate limit reached, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.requestCount = 0;
        this.lastRequestTime = Date.now();
      }
    } else {
      this.requestCount = 1;
      this.lastRequestTime = now;
    }
  }

  async getUserDetails(username: string): Promise<TwitterUser | null> {
    try {
      await this.rateLimit();
      const response = await this.axiosInstance.get('/user', {
        params: { username }
      });
      
      if (response.data && response.data.result && response.data.result.data) {
        const userData = response.data.result.data.user.result;
        const legacy = userData.legacy || {};
        const core = userData.core || {};
        
        return {
          id: userData.rest_id,
          username: core.screen_name || legacy.screen_name || username,
          name: core.name || legacy.name || '',
          followers_count: legacy.followers_count || 0,
          following_count: legacy.friends_count || 0,
          verified: legacy.verified || userData.is_blue_verified || false
        };
      }
      return null;
    } catch (error) {
      console.error(`Error fetching user details for ${username}:`, error);
      return null;
    }
  }

  async searchTweets(query: string, count: number = 20, type: string = 'Top'): Promise<SearchResult> {
    try {
      await this.rateLimit();
      const response = await this.axiosInstance.get('/search-v2', {
        params: { 
          query,
          count,
          type
        }
      });
      
      const tweets: Tweet[] = [];
      
      if (response.data && response.data.result && response.data.result.timeline) {
        const instructions = response.data.result.timeline.instructions || [];
        
        for (const instruction of instructions) {
          if (instruction.type === 'TimelineAddEntries' && instruction.entries) {
            for (const entry of instruction.entries) {
              // Handle different entry types
              if (entry.content?.itemContent?.tweet_results?.result) {
                const tweetData = entry.content.itemContent.tweet_results.result;
                const tweet = this.parseTweetData(tweetData);
                if (tweet) tweets.push(tweet);
              }
              // Handle module entries (like user modules)
              else if (entry.content?.items) {
                for (const item of entry.content.items) {
                  if (item.item?.itemContent?.tweet_results?.result) {
                    const tweetData = item.item.itemContent.tweet_results.result;
                    const tweet = this.parseTweetData(tweetData);
                    if (tweet) tweets.push(tweet);
                  }
                }
              }
            }
          }
        }
      }
      
      return { tweets };
    } catch (error) {
      console.error(`Error searching tweets for query "${query}":`, error);
      return { tweets: [] };
    }
  }

  private parseTweetData(tweetData: any): Tweet | null {
    if (!tweetData || !tweetData.rest_id) return null;
    
    const legacy = tweetData.legacy || {};
    const core = tweetData.core || {};
    const userResult = core.user_results?.result;
    const userLegacy = userResult?.legacy || {};
    const userCore = userResult?.core || {};
    
    return {
      id: tweetData.rest_id,
      text: legacy.full_text || '',
      author_id: legacy.user_id_str || userResult?.rest_id || '',
      created_at: legacy.created_at || '',
      username: userCore.screen_name || userLegacy.screen_name || '',
      name: userCore.name || userLegacy.name || ''
    };
  }

  async getUserTweets(userId: string, count: number = 20): Promise<Tweet[]> {
    try {
      await this.rateLimit();
      const response = await this.axiosInstance.get('/user-tweets', {
        params: { 
          user: userId,
          count
        }
      });
      
      const tweets: Tweet[] = [];
      
      if (response.data && response.data.result && response.data.result.timeline) {
        const instructions = response.data.result.timeline.instructions || [];
        
        for (const instruction of instructions) {
          if (instruction.entries) {
            for (const entry of instruction.entries) {
              if (entry.content?.itemContent?.tweet_results?.result) {
                const tweet = this.parseTweetData(entry.content.itemContent.tweet_results.result);
                if (tweet) tweets.push(tweet);
              }
            }
          }
        }
      }
      
      return tweets;
    } catch (error) {
      console.error(`Error fetching tweets for user ${userId}:`, error);
      return [];
    }
  }

  async getPostComments(postId: string, count: number = 20): Promise<Tweet[]> {
    try {
      await this.rateLimit();
      const response = await this.axiosInstance.get('/comments-v2', {
        params: { 
          pid: postId,
          rankingMode: 'Relevance',
          count
        }
      });
      
      const comments: Tweet[] = [];
      
      if (response.data && response.data.result && response.data.result.timeline) {
        const instructions = response.data.result.timeline.instructions || [];
        
        for (const instruction of instructions) {
          if (instruction.entries) {
            for (const entry of instruction.entries) {
              if (entry.content?.itemContent?.tweet_results?.result) {
                const comment = this.parseTweetData(entry.content.itemContent.tweet_results.result);
                if (comment) comments.push(comment);
              }
            }
          }
        }
      }
      
      return comments;
    } catch (error) {
      console.error(`Error fetching comments for post ${postId}:`, error);
      return [];
    }
  }
}