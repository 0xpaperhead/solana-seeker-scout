import OpenAI from "openai";
import Config from '../config/config';

interface TweetAnalysis {
  sentiment: "positive" | "neutral" | "negative";
  reasoning: string;
  sentiment_score: number;
  ownership: "yes" | "no" | "unknown";
}

export class TweetAnalyzer {
  private openai: OpenAI;

  constructor() {
    if (!Config.openai.apiKey) {
      throw new Error('OpenAI API key not found. Please set OPENAI_API_KEY in .env file');
    }

    this.openai = new OpenAI({
      apiKey: Config.openai.apiKey,
    });
  }

  async analyzeTweet(tweetText: string): Promise<TweetAnalysis> {
    try {
      const response = await this.openai.responses.create({
        model: "gpt-5-nano",
        input: [
          {
            "role": "developer",
            "content": [
              {
                "type": "input_text",
                "text": "Evaluate a tweet to determine its underlying sentiment and whether the tweet’s author indicates ownership of the SKR domain.\n\nCarefully analyze the full text of the tweet, considering explicit statements, tone, context, possible sarcasm, word choice, and references to domain ownership. Begin by providing detailed reasoning for any sentiment you identify, referencing specific features and evidence from the tweet that led to your assessment. Next, infer ownership status of the SKR domain by the tweet’s author, using explicit statements, implied claims, or a lack thereof; explain your rationale for this classification in the reasoning step as well.\n\nAfter this reasoning step, assign all required output fields:\n1. Overall sentiment label (choose strictly from \"positive\", \"neutral\", or \"negative\").\n2. Sentiment score (an integer from 1 for most negative to 10 for most positive).\n3. Ownership status (choose strictly from \"yes\", \"no\", or \"unknown\"). \"Yes\" if the author clearly states or strongly implies they own the SKR domain; \"no\" if they clearly state or strongly imply they do not own it; \"unknown\" if ownership cannot be reasonably inferred.\n\nEnsure your output reasoning presents all the supporting evidence for both sentiment and ownership assignments, and appears before the final label fields.\n\nContinue analyzing tweets until each is fully evaluated according to the required schema below.\n\nAlways return your response as a strict JSON object with all of the following fields and no additional fields:\n\n- **reasoning** (string): Your explanation of sentiment and ownership decisions, citing specific tweet content and how it led to your conclusions.\n- **sentiment** (string, enum: \"positive\", \"neutral\", \"negative\"): The overall sentiment of the tweet.\n- **sentiment_score** (number, min 1, max 10): Integer score corresponding to the level of positivity or negativity.\n- **ownership** (string, enum: \"yes\", \"no\", \"unknown\"): Whether the tweet author indicates they own the SKR domain, as explained above.\n\nExample:\n\nInput tweet: \"Can't believe how great this new update is! Loving it so far. Proud to finally say I'm the owner of my own SKR domain.\"\n \nOutput:\n{\n  \"reasoning\": \"The tweet uses positive expressions like 'great' and 'loving it', indicating strong approval and positive sentiment. The phrase 'I'm the owner of my own SKR domain' clearly indicates ownership.\",\n  \"sentiment\": \"positive\",\n  \"sentiment_score\": 9,\n  \"ownership\": \"yes\"\n}\n\n(For more complex tweets, expand the reasoning appropriately; real examples should cite multiple details from the tweet to support sentiment and ownership. If ownership cannot be inferred or is not mentioned, set 'ownership' to 'unknown' and clarify this in your reasoning.)\n\nImportant: Your primary goals are to (1) thoroughly justify sentiment and ownership assignments using direct tweet evidence, (2) strictly adhere to the allowed categories for each field, and (3) produce a properly structured JSON object with all four required fields and no additional keys."
              }
            ]
          },
          {
            "role": "user",
            "content": [
              {
                "type": "input_text",
                "text": tweetText
              }
            ]
          }
        ],
        text: {
          "format": {
            "type": "json_schema",
            "name": "skr_domain_tweet_sentiment_with_ownership",
            "strict": true,
            "schema": {
              "type": "object",
              "properties": {
                "sentiment": {
                  "type": "string",
                  "description": "Overall sentiment of the tweet. Must be one of 'positive', 'neutral', or 'negative'.",
                  "enum": [
                    "positive",
                    "neutral",
                    "negative"
                  ]
                },
                "reasoning": {
                  "type": "string",
                  "description": "Reasoning behind the assigned sentiment."
                },
                "sentiment_score": {
                  "type": "number",
                  "description": "Numerical score representing sentiment (1=lowest/most negative, 10=highest/most positive).",
                  "minimum": 1,
                  "maximum": 10
                },
                "ownership": {
                  "type": "string",
                  "description": "Whether the tweet author indicates they own the SKR domain. Must be 'yes', 'no', or 'unknown'.",
                  "enum": [
                    "yes",
                    "no",
                    "unknown"
                  ]
                }
              },
              "required": [
                "sentiment",
                "reasoning",
                "sentiment_score",
                "ownership"
              ],
              "additionalProperties": false
            }
          }
        },
        reasoning: {
          "effort": "low"
        },
        tools: [],
        store: true
      });

      return response.text as TweetAnalysis;
    } catch (error) {
      console.error('Error analyzing tweet:', error);
      throw error;
    }
  }

  async analyzeBatch(tweets: Array<{ tweetText: string; tweetId: string; username: string }>): Promise<Array<TweetAnalysis & { tweetId: string; username: string }>> {
    const results = [];

    for (const tweet of tweets) {
      try {
        const analysis = await this.analyzeTweet(tweet.tweetText);
        results.push({
          ...analysis,
          tweetId: tweet.tweetId,
          username: tweet.username
        });

        // Add delay to respect rate limits
        await this.delay(1000);
      } catch (error) {
        console.error(`Error analyzing tweet ${tweet.tweetId} from @${tweet.username}:`, error);
        // Add fallback analysis for failed tweets
        results.push({
          sentiment: "neutral" as const,
          reasoning: "Analysis failed due to API error",
          sentiment_score: 5,
          ownership: "unknown" as const,
          tweetId: tweet.tweetId,
          username: tweet.username
        });
      }
    }

    return results;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default TweetAnalyzer;