import { TwitterClient } from '../clients/twitter-client';
import { SkrDomainScanner, DomainMention } from '../scanners/domain-scanner';
import { AdaptiveSearchStrategy } from '../strategies/adaptive-search-strategy';
import * as fs from 'fs';
import * as path from 'path';

interface ScoutedData {
  domain: string;
  username: string;
  userId?: string;
  followers: number;
  tweetId: string;
  tweetText: string;
  timestamp: string;
  scoutedAt: string;
}

interface ScoutProgress {
  totalScanned: number;
  domainsFound: number;
  usersProcessed: number;
  lastCheckpoint: string;
  errors: string[];
}

export class DataScout {
  private twitterClient: TwitterClient;
  private scanner: SkrDomainScanner;
  private adaptiveStrategy: AdaptiveSearchStrategy;
  private scoutedData: ScoutedData[] = [];
  private processedUsers: Set<string> = new Set();
  private progress: ScoutProgress;
  private outputDir: string;

  constructor(apiKey: string, outputDir: string = './output/scout-results') {
    this.twitterClient = new TwitterClient(apiKey);
    this.scanner = new SkrDomainScanner();
    this.adaptiveStrategy = new AdaptiveSearchStrategy();
    this.outputDir = outputDir;
    this.progress = {
      totalScanned: 0,
      domainsFound: 0,
      usersProcessed: 0,
      lastCheckpoint: new Date().toISOString(),
      errors: []
    };

    this.ensureOutputDirectory();
    this.loadExistingData();
    this.loadAdaptiveState();
  }

  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  private loadExistingData(): void {
    const dataFile = path.join(this.outputDir, 'scouted_data.json');
    const progressFile = path.join(this.outputDir, 'progress.json');

    if (fs.existsSync(dataFile)) {
      try {
        this.scoutedData = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
        console.log(`Loaded ${this.scoutedData.length} existing records`);
        
        this.scoutedData.forEach((item: ScoutedData) => {
          if (item.username) {
            this.processedUsers.add(item.username);
          }
        });
      } catch (error) {
        console.error('Error loading existing data:', error);
      }
    }

    if (fs.existsSync(progressFile)) {
      try {
        this.progress = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
        console.log('Loaded previous progress');
      } catch (error) {
        console.error('Error loading progress:', error);
      }
    }
  }

  private saveData(): void {
    const dataFile = path.join(this.outputDir, 'scouted_data.json');
    const csvFile = path.join(this.outputDir, 'scouted_data.csv');
    const progressFile = path.join(this.outputDir, 'progress.json');

    try {
      fs.writeFileSync(dataFile, JSON.stringify(this.scoutedData, null, 2));
      
      const csvHeader = 'Domain,Username,User ID,Followers,Tweet ID,Tweet Text,Timestamp,Scouted At\n';
      const csvRows = this.scoutedData.map(item => 
        `"${item.domain}","${item.username}","${item.userId || ''}",${item.followers},"${item.tweetId}","${item.tweetText.replace(/"/g, '""')}","${item.timestamp}","${item.scoutedAt}"`
      ).join('\n');
      fs.writeFileSync(csvFile, csvHeader + csvRows);
      
      this.progress.lastCheckpoint = new Date().toISOString();
      fs.writeFileSync(progressFile, JSON.stringify(this.progress, null, 2));
      
      this.saveAdaptiveState();
      
      console.log(`Data saved: ${this.scoutedData.length} records`);
    } catch (error) {
      console.error('Error saving data:', error);
      this.progress.errors.push(`Save error: ${error}`);
    }
  }

  private loadAdaptiveState(): void {
    const adaptiveFile = path.join(this.outputDir, 'adaptive_state.json');
    
    if (fs.existsSync(adaptiveFile)) {
      try {
        const state = JSON.parse(fs.readFileSync(adaptiveFile, 'utf-8'));
        this.adaptiveStrategy.loadState(state);
        console.log('Loaded adaptive search state');
      } catch (error) {
        console.error('Error loading adaptive state:', error);
      }
    }
  }

  private saveAdaptiveState(): void {
    const adaptiveFile = path.join(this.outputDir, 'adaptive_state.json');
    
    try {
      const state = this.adaptiveStrategy.saveState();
      fs.writeFileSync(adaptiveFile, JSON.stringify(state, null, 2));
    } catch (error) {
      console.error('Error saving adaptive state:', error);
    }
  }

  async scoutFromSearch(query: string, maxResults: number = 100): Promise<DomainMention[]> {
    const allMentions: DomainMention[] = [];
    let processedCount = 0;

    try {
      console.log(`Searching for: "${query}"`);
      
      while (processedCount < maxResults) {
        const searchResult = await this.twitterClient.searchTweets(
          query, 
          Math.min(20, maxResults - processedCount)
        );

        if (searchResult.tweets.length === 0) {
          break;
        }

        const mentions = this.scanner.scanMultipleTweets(searchResult.tweets);
        allMentions.push(...mentions);
        
        this.progress.totalScanned += searchResult.tweets.length;
        processedCount += searchResult.tweets.length;

        console.log(`Scanned ${processedCount} tweets, found ${mentions.length} .skr mentions`);

        if (processedCount < maxResults && searchResult.tweets.length === 20) {
          await this.scanner.delay(2000);
        } else {
          break;
        }
      }
    } catch (error) {
      console.error(`Error scouting from search "${query}":`, error);
      this.progress.errors.push(`Search error for "${query}": ${error}`);
    }

    return allMentions;
  }

  async enrichWithUserData(mentions: DomainMention[]): Promise<ScoutedData[]> {
    const enrichedData: ScoutedData[] = [];

    for (const mention of mentions) {
      if (this.processedUsers.has(mention.username)) {
        const existing = this.scoutedData.find(
          (item: ScoutedData) => item.username === mention.username && item.domain === mention.domain
        );
        if (existing) {
          enrichedData.push(existing);
          continue;
        }
      }

      try {
        console.log(`Fetching user data for @${mention.username}`);
        const userDetails = await this.twitterClient.getUserDetails(mention.username);

        if (userDetails) {
          const scoutedItem: ScoutedData = {
            domain: mention.domain,
            username: mention.username,
            userId: userDetails.id,
            followers: userDetails.followers_count,
            tweetId: mention.tweetId,
            tweetText: mention.tweetText,
            timestamp: mention.timestamp,
            scoutedAt: new Date().toISOString()
          };

          enrichedData.push(scoutedItem);
          this.scoutedData.push(scoutedItem);
          this.processedUsers.add(mention.username);
          this.progress.usersProcessed++;
          this.progress.domainsFound++;

          console.log(`✓ @${mention.username} - ${userDetails.followers_count} followers - ${mention.domain}`);
        }
      } catch (error) {
        console.error(`Error enriching data for @${mention.username}:`, error);
        this.progress.errors.push(`User enrichment error for @${mention.username}: ${error}`);
      }

      await this.scanner.delay(1500);
    }

    return enrichedData;
  }

  async runScoutCycle(): Promise<void> {
    console.log('Starting intelligent scout cycle...');
    
    // Get AI-generated queries based on current context
    const queries = await this.adaptiveStrategy.getNextSearchQueries();
    console.log(`AI generated ${queries.length} queries:`, queries);
    
    const allMentions: DomainMention[] = [];

    for (const query of queries) {
      console.log(`\n🔍 Searching: "${query}"`);
      const mentions = await this.scoutFromSearch(query, 50);
      
      // Record query performance for adaptive learning
      this.adaptiveStrategy.recordQueryResult(query, mentions.length);
      
      allMentions.push(...mentions);
      
      if (mentions.length > 0) {
        console.log(`✅ Found ${mentions.length} mentions`);
      } else {
        console.log(`❌ No results`);
      }
      
      await this.scanner.delay(3000);
    }

    const uniqueMentions = this.scanner.deduplicateMentions(allMentions);
    console.log(`\n📊 Found ${uniqueMentions.length} unique .skr domain mentions`);

    if (uniqueMentions.length > 0) {
      await this.enrichWithUserData(uniqueMentions);
      this.saveData();
    }

    this.printAdaptiveInsights();
    this.printSummary();
  }

  async scoutSpecificDomains(domains: string[]): Promise<void> {
    console.log(`Scouting specific domains: ${domains.join(', ')}`);
    const allMentions: DomainMention[] = [];

    for (const domain of domains) {
      const mentions = await this.scoutFromSearch(domain, 30);
      allMentions.push(...mentions);
      await this.scanner.delay(2000);
    }

    const uniqueMentions = this.scanner.deduplicateMentions(allMentions);
    
    if (uniqueMentions.length > 0) {
      await this.enrichWithUserData(uniqueMentions);
      this.saveData();
    }

    this.printSummary();
  }

  async scoutFromUserList(usernames: string[]): Promise<void> {
    console.log(`Scouting from ${usernames.length} users`);
    const allMentions: DomainMention[] = [];

    for (const username of usernames) {
      try {
        const userDetails = await this.twitterClient.getUserDetails(username);
        
        if (userDetails) {
          const tweets = await this.twitterClient.getUserTweets(userDetails.id, 50);
          const mentions = this.scanner.scanMultipleTweets(tweets);
          
          for (const mention of mentions) {
            mention.username = username;
            mention.userId = userDetails.id;
            mention.followers = userDetails.followers_count;
          }
          
          allMentions.push(...mentions);
          console.log(`Found ${mentions.length} mentions from @${username}`);
        }
      } catch (error) {
        console.error(`Error scouting from @${username}:`, error);
      }
      
      await this.scanner.delay(2000);
    }

    if (allMentions.length > 0) {
      const scoutedItems = allMentions.map(mention => ({
        domain: mention.domain,
        username: mention.username,
        userId: mention.userId,
        followers: mention.followers || 0,
        tweetId: mention.tweetId,
        tweetText: mention.tweetText,
        timestamp: mention.timestamp,
        scoutedAt: new Date().toISOString()
      }));

      this.scoutedData.push(...scoutedItems);
      this.progress.domainsFound += scoutedItems.length;
      this.progress.usersProcessed += usernames.length;
      this.saveData();
    }

    this.printSummary();
  }

  getScoutedData(): ScoutedData[] {
    return this.scoutedData;
  }

  getTopInfluencers(limit: number = 10): ScoutedData[] {
    return [...this.scoutedData]
      .sort((a, b) => b.followers - a.followers)
      .slice(0, limit);
  }

  getDomainStats(): Map<string, { count: number; totalFollowers: number }> {
    const stats = new Map<string, { count: number; totalFollowers: number }>();
    
    for (const item of this.scoutedData) {
      const current = stats.get(item.domain) || { count: 0, totalFollowers: 0 };
      current.count++;
      current.totalFollowers += item.followers;
      stats.set(item.domain, current);
    }
    
    return stats;
  }

  private printAdaptiveInsights(): void {
    const context = this.adaptiveStrategy.getSearchContext();
    const metrics = this.adaptiveStrategy.getSearchMetrics();
    
    console.log('\n🧠 === AI Adaptive Insights ===');
    console.log(`Search queries tried: ${context.previousQueries.length}`);
    console.log(`Successful queries: ${context.successfulQueries.length}`);
    console.log(`Average results per query: ${context.averageResultsPerQuery.toFixed(2)}`);
    
    if (context.lastSuccessfulSearch) {
      const hoursSince = (Date.now() - context.lastSuccessfulSearch.getTime()) / (1000 * 60 * 60);
      console.log(`Hours since last success: ${hoursSince.toFixed(1)}`);
    }
    
    // Show top performing queries
    if (metrics.queryPerformance.size > 0) {
      console.log('\n🎯 Top Performing Queries:');
      const topQueries = Array.from(metrics.queryPerformance.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      
      topQueries.forEach(([query, results], index) => {
        console.log(`${index + 1}. "${query}" - ${results} results`);
      });
    }
  }

  private printSummary(): void {
    console.log('\n📈 === Scout Summary ===');
    console.log(`Total tweets scanned: ${this.progress.totalScanned}`);
    console.log(`Unique .skr domains found: ${this.progress.domainsFound}`);
    console.log(`Users processed: ${this.progress.usersProcessed}`);
    console.log(`Total scouted records: ${this.scoutedData.length}`);
    
    const topInfluencers = this.getTopInfluencers(5);
    if (topInfluencers.length > 0) {
      console.log('\n🌟 Top 5 Influencers:');
      topInfluencers.forEach((item, index) => {
        console.log(`${index + 1}. @${item.username} - ${item.followers.toLocaleString()} followers - ${item.domain}`);
      });
    }
    
    const domainStats = this.getDomainStats();
    if (domainStats.size > 0) {
      console.log('\n🏆 Top Domains by Mentions:');
      const sortedDomains = Array.from(domainStats.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5);
      
      sortedDomains.forEach(([domain, stats]) => {
        console.log(`${domain}: ${stats.count} mentions, ${stats.totalFollowers.toLocaleString()} total followers`);
      });
    }
    
    if (this.progress.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${this.progress.errors.length}`);
    }
  }

}