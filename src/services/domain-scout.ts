import { TwitterClient } from '../clients/twitter-client';
import { SolanaDomainDumper } from '../integrations/solana-domain-dumper';
import TweetAnalyzer from './tweet-analyzer';
import Config from '../config/config';
import * as fs from 'fs';
import * as path from 'path';

interface ScoutMention {
  domain: string;
  username: string;
  userId: string;
  followers: number;
  verified: boolean;
  tweetId: string;
  tweetText: string;
  timestamp: string;
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number;
  ownership: "yes" | "no" | "unknown";
  reasoning: string;
  scoutedAt: string;
}

interface DomainAnalytics {
  domain: string;
  totalMentions: number;
  uniqueUsers: number;
  totalReach: number; // Sum of all followers
  averageFollowers: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  ownershipBreakdown: {
    confirmed: number;
    denied: number;
    unknown: number;
  };
  topInfluencers: ScoutMention[];
  averageSentimentScore: number;
}

interface ScoutResults {
  totalDomains: number;
  domainsWithMentions: number;
  totalMentions: number;
  totalReach: number;
  scoutedAt: string;
  domains: DomainAnalytics[];
  mentions: ScoutMention[];
}

export class DomainScout {
  private twitterClient: TwitterClient;
  private domainDumper: SolanaDomainDumper;
  private tweetAnalyzer: TweetAnalyzer;
  private outputDir: string;

  constructor() {
    this.twitterClient = new TwitterClient(Config.rapidapi.key);
    this.domainDumper = new SolanaDomainDumper(Config.solana.rpcUrl);
    this.tweetAnalyzer = new TweetAnalyzer();
    this.outputDir = Config.output.directory;
    this.ensureOutputDirectory();
  }

  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async scoutAllRegisteredDomains(): Promise<ScoutResults> {
    console.log('🔄 Getting registered domains...');
    const domains = await this.domainDumper.fetchAllSkrDomains();
    const domainNames = domains.map(d => d.domain);
    
    console.log(`📋 Found ${domainNames.length} registered domains`);
    return await this.scoutDomains(domainNames);
  }

  async scoutDomains(domainNames: string[]): Promise<ScoutResults> {
    console.log(`🎯 Starting scout for ${domainNames.length} domains...`);
    
    const allMentions: ScoutMention[] = [];
    const domainAnalytics: DomainAnalytics[] = [];

    for (const domain of domainNames) {
      console.log(`\n🔍 Searching mentions for: ${domain}`);
      
      try {
        const domainMentions = await this.scoutSingleDomain(domain);
        allMentions.push(...domainMentions);
        
        if (domainMentions.length > 0) {
          const analytics = this.generateDomainAnalytics(domain, domainMentions);
          domainAnalytics.push(analytics);
          console.log(`✅ ${domain}: ${domainMentions.length} mentions, ${analytics.totalReach.toLocaleString()} total reach`);
        } else {
          console.log(`❌ ${domain}: No mentions found`);
        }
        
        // Rate limiting
        await this.delay(3000);
        
      } catch (error) {
        console.error(`❌ Error scouting ${domain}:`, error);
      }
    }

    const results = this.compileResults(domainNames, domainAnalytics, allMentions);
    await this.saveResults(results);
    
    return results;
  }

  private async scoutSingleDomain(domain: string): Promise<ScoutMention[]> {
    // 1. Search Twitter for mentions
    const searchResult = await this.twitterClient.searchTweets(`"${domain}"`, 20);
    
    if (searchResult.tweets.length === 0) {
      return [];
    }

    console.log(`  📊 Found ${searchResult.tweets.length} tweets mentioning ${domain}`);
    
    // 2. Analyze sentiment with OpenAI
    const tweetsForAnalysis = searchResult.tweets.map(tweet => ({
      tweetText: tweet.text,
      tweetId: tweet.id,
      username: tweet.username || 'unknown'
    }));
    
    console.log('  🧠 Analyzing sentiment with OpenAI...');
    const sentimentAnalysis = await this.tweetAnalyzer.analyzeBatch(tweetsForAnalysis);
    
    // 3. Get user details and compile mentions
    const mentions: ScoutMention[] = [];
    
    for (let i = 0; i < searchResult.tweets.length; i++) {
      const tweet = searchResult.tweets[i];
      const analysis = sentimentAnalysis[i];
      
      if (!analysis) continue;
      
      const username = tweet.username || `user_${tweet.author_id}`;
      
      try {
        // Get user details for analytics - only if we have a real username
        let userDetails = null;
        if (tweet.username) {
          console.log(`  👤 Getting details for @${username}...`);
          userDetails = await this.twitterClient.getUserDetails(username);
        }
        
        mentions.push({
          domain,
          username: username,
          userId: tweet.author_id,
          followers: userDetails?.followers_count || 0,
          verified: userDetails?.verified || false,
          tweetId: tweet.id,
          tweetText: tweet.text,
          timestamp: tweet.created_at,
          sentiment: analysis.sentiment,
          sentimentScore: analysis.sentiment_score,
          ownership: analysis.ownership,
          reasoning: analysis.reasoning,
          scoutedAt: new Date().toISOString()
        });
        
        if (userDetails) {
          console.log(`    ✅ @${username}: ${userDetails.followers_count} followers`);
        } else {
          console.log(`    ⚠️  @${username}: No user details available`);
        }
        
        // Rate limiting for user details
        await this.delay(2000);
        
      } catch (error) {
        console.error(`  ❌ Failed to get user details for @${username}:`, error);
        
        // Add mention without full user details
        mentions.push({
          domain,
          username: username,
          userId: tweet.author_id,
          followers: 0,
          verified: false,
          tweetId: tweet.id,
          tweetText: tweet.text,
          timestamp: tweet.created_at,
          sentiment: analysis.sentiment,
          sentimentScore: analysis.sentiment_score,
          ownership: analysis.ownership,
          reasoning: analysis.reasoning,
          scoutedAt: new Date().toISOString()
        });
      }
    }
    
    return mentions;
  }

  private generateDomainAnalytics(domain: string, mentions: ScoutMention[]): DomainAnalytics {
    const totalMentions = mentions.length;
    const uniqueUsers = new Set(mentions.map(m => m.username)).size;
    const totalReach = mentions.reduce((sum, m) => sum + m.followers, 0);
    const averageFollowers = totalReach / totalMentions;
    
    const sentimentBreakdown = {
      positive: mentions.filter(m => m.sentiment === 'positive').length,
      neutral: mentions.filter(m => m.sentiment === 'neutral').length,
      negative: mentions.filter(m => m.sentiment === 'negative').length,
    };
    
    const ownershipBreakdown = {
      confirmed: mentions.filter(m => m.ownership === 'yes').length,
      denied: mentions.filter(m => m.ownership === 'no').length,
      unknown: mentions.filter(m => m.ownership === 'unknown').length,
    };
    
    const topInfluencers = mentions
      .sort((a, b) => b.followers - a.followers)
      .slice(0, 5);
    
    const averageSentimentScore = mentions.reduce((sum, m) => sum + m.sentimentScore, 0) / totalMentions;
    
    return {
      domain,
      totalMentions,
      uniqueUsers,
      totalReach,
      averageFollowers,
      sentimentBreakdown,
      ownershipBreakdown,
      topInfluencers,
      averageSentimentScore
    };
  }

  private compileResults(domainNames: string[], domainAnalytics: DomainAnalytics[], mentions: ScoutMention[]): ScoutResults {
    return {
      totalDomains: domainNames.length,
      domainsWithMentions: domainAnalytics.length,
      totalMentions: mentions.length,
      totalReach: mentions.reduce((sum, m) => sum + m.followers, 0),
      scoutedAt: new Date().toISOString(),
      domains: domainAnalytics.sort((a, b) => b.totalReach - a.totalReach),
      mentions: mentions.sort((a, b) => b.followers - a.followers)
    };
  }

  private async saveResults(results: ScoutResults): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    
    // Save full results
    const resultsFile = path.join(this.outputDir, `scout-results-${timestamp}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    
    // Save latest results (overwrite)
    const latestFile = path.join(this.outputDir, 'latest-scout-results.json');
    fs.writeFileSync(latestFile, JSON.stringify(results, null, 2));
    
    // Save CSV for easy analysis
    const csvFile = path.join(this.outputDir, `scout-mentions-${timestamp}.csv`);
    const csvHeader = 'Domain,Username,User ID,Followers,Verified,Tweet ID,Tweet Text,Timestamp,Sentiment,Sentiment Score,Ownership,Reasoning,Scouted At\n';
    const csvRows = results.mentions.map(m => 
      `"${m.domain}","${m.username}","${m.userId}",${m.followers},${m.verified},"${m.tweetId}","${m.tweetText.replace(/"/g, '""')}","${m.timestamp}","${m.sentiment}",${m.sentimentScore},"${m.ownership}","${m.reasoning.replace(/"/g, '""')}","${m.scoutedAt}"`
    ).join('\n');
    fs.writeFileSync(csvFile, csvHeader + csvRows);
    
    console.log(`\n💾 Results saved:`);
    console.log(`   📊 Full results: ${resultsFile}`);
    console.log(`   📈 Latest: ${latestFile}`);
    console.log(`   📋 CSV: ${csvFile}`);
  }

  printSummary(results: ScoutResults): void {
    console.log('\n🎯 === Scout Summary ===');
    console.log(`Domains searched: ${results.totalDomains}`);
    console.log(`Domains with mentions: ${results.domainsWithMentions} (${(results.domainsWithMentions / results.totalDomains * 100).toFixed(1)}%)`);
    console.log(`Total mentions found: ${results.totalMentions}`);
    console.log(`Total reach: ${results.totalReach.toLocaleString()} followers`);
    
    if (results.domains.length > 0) {
      console.log('\n🏆 Top domains by reach:');
      results.domains.slice(0, 5).forEach((domain, index) => {
        console.log(`${index + 1}. ${domain.domain}: ${domain.totalMentions} mentions, ${domain.totalReach.toLocaleString()} reach`);
      });
    }
    
    // Sentiment overview
    const totalPositive = results.mentions.filter(m => m.sentiment === 'positive').length;
    const totalNeutral = results.mentions.filter(m => m.sentiment === 'neutral').length;
    const totalNegative = results.mentions.filter(m => m.sentiment === 'negative').length;
    
    console.log('\n💭 Overall sentiment:');
    console.log(`   Positive: ${totalPositive} (${(totalPositive / results.totalMentions * 100).toFixed(1)}%)`);
    console.log(`   Neutral: ${totalNeutral} (${(totalNeutral / results.totalMentions * 100).toFixed(1)}%)`);
    console.log(`   Negative: ${totalNegative} (${(totalNegative / results.totalMentions * 100).toFixed(1)}%)`);
    
    // Ownership overview
    const confirmedOwners = results.mentions.filter(m => m.ownership === 'yes').length;
    console.log(`\n👑 Domain owners identified: ${confirmedOwners}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}