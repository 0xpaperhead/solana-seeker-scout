import { TwitterClient } from '../clients/twitter-client';
import { SkrDomainScanner, DomainMention } from './domain-scanner';
import { SolanaDomainDumper } from '../integrations/solana-domain-dumper';
import * as fs from 'fs';
import * as path from 'path';

interface DomainSearchResult {
  domain: string;
  mentions: DomainMention[];
  searchQueries: string[];
  totalMentions: number;
  uniqueUsers: number;
}

interface SearchProgress {
  domainsProcessed: number;
  totalDomains: number;
  mentionsFound: number;
  currentDomain: string;
  startTime: Date;
}

export class DomainSpecificSearch {
  private twitterClient: TwitterClient;
  private scanner: SkrDomainScanner;
  private domainDumper: SolanaDomainDumper;
  private outputDir: string;
  private progress: SearchProgress;

  constructor(apiKey: string, rpcUrl: string, outputDir: string = './output/scout-results') {
    this.twitterClient = new TwitterClient(apiKey);
    this.scanner = new SkrDomainScanner();
    this.domainDumper = new SolanaDomainDumper(rpcUrl, outputDir);
    this.outputDir = outputDir;
    
    this.progress = {
      domainsProcessed: 0,
      totalDomains: 0,
      mentionsFound: 0,
      currentDomain: '',
      startTime: new Date()
    };
  }

  async searchSpecificDomains(domainList: string[], maxQueriesPerDomain: number = 3): Promise<DomainSearchResult[]> {
    const results: DomainSearchResult[] = [];
    
    this.progress.totalDomains = domainList.length;
    this.progress.startTime = new Date();
    
    console.log(`🎯 Starting targeted search for ${domainList.length} specific .skr domains`);
    
    for (const domain of domainList) {
      this.progress.currentDomain = domain;
      
      try {
        const result = await this.searchSingleDomain(domain, maxQueriesPerDomain);
        results.push(result);
        
        this.progress.domainsProcessed++;
        this.progress.mentionsFound += result.totalMentions;
        
        if (result.totalMentions > 0) {
          console.log(`✅ ${domain}: ${result.totalMentions} mentions from ${result.uniqueUsers} users`);
        } else {
          console.log(`❌ ${domain}: No mentions found`);
        }
        
        this.printProgress();
        
        // Rate limiting
        await this.delay(2000);
        
      } catch (error) {
        console.error(`Error searching domain ${domain}:`, error);
        results.push({
          domain,
          mentions: [],
          searchQueries: [],
          totalMentions: 0,
          uniqueUsers: 0
        });
      }
    }
    
    return results;
  }

  async searchSingleDomain(domain: string, maxQueries: number = 3): Promise<DomainSearchResult> {
    const searchQueries = this.generateDomainQueries(domain, maxQueries);
    const allMentions: DomainMention[] = [];
    
    for (const query of searchQueries) {
      try {
        const searchResult = await this.twitterClient.searchTweets(query, 20);
        const mentions = this.scanner.scanMultipleTweets(searchResult.tweets);
        
        // Filter mentions to only include the specific domain we're searching for
        const domainSpecificMentions = mentions.filter(mention => 
          mention.domain.toLowerCase() === domain.toLowerCase()
        );
        
        allMentions.push(...domainSpecificMentions);
        
        await this.delay(1500);
      } catch (error) {
        console.error(`Error searching query "${query}":`, error);
      }
    }
    
    // Deduplicate mentions
    const uniqueMentions = this.scanner.deduplicateMentions(allMentions);
    const uniqueUsers = new Set(uniqueMentions.map(m => m.username)).size;
    
    return {
      domain,
      mentions: uniqueMentions,
      searchQueries,
      totalMentions: uniqueMentions.length,
      uniqueUsers
    };
  }

  private generateDomainQueries(domain: string, maxQueries: number = 3): string[] {
    const baseDomain = domain.toLowerCase();
    const domainWithoutTld = baseDomain.replace('.skr', '');
    
    const queries = [
      `"${baseDomain}"`,  // Exact domain search
      baseDomain,         // Without quotes
      `${domainWithoutTld} .skr`,  // Domain name + .skr
      `registered ${baseDomain}`,  // Registration mentions
      `claiming ${baseDomain}`,    // Claiming mentions
      `bought ${baseDomain}`,      // Purchase mentions
      `my ${baseDomain}`,          // Ownership mentions
      `${baseDomain} wallet`,      // Wallet usage
      `${domainWithoutTld} domain`, // General domain discussion
      `${baseDomain} solana`       // Platform mentions
    ];
    
    return queries.slice(0, maxQueries);
  }

  async searchAllRegisteredDomains(forceRefresh: boolean = false, batchSize: number = 50): Promise<DomainSearchResult[]> {
    console.log('📋 Loading registered .skr domains...');
    
    // Get all registered domains
    const domains = await this.domainDumper.dumpAllDomains();
    const domainNames = domains.map((d: any) => d.domain);
    
    console.log(`Found ${domainNames.length} registered .skr domains`);
    
    if (domainNames.length === 0) {
      console.log('❌ No domains found. Make sure the domain dumper is working correctly.');
      return [];
    }
    
    // Process in batches
    const results: DomainSearchResult[] = [];
    
    for (let i = 0; i < domainNames.length; i += batchSize) {
      const batch = domainNames.slice(i, i + batchSize);
      console.log(`\n🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(domainNames.length / batchSize)}`);
      
      const batchResults = await this.searchSpecificDomains(batch, 2); // Reduced queries per domain for large batches
      results.push(...batchResults);
      
      // Save intermediate results
      await this.saveResults(results);
      
      // Longer delay between batches
      if (i + batchSize < domainNames.length) {
        console.log('⏸️  Pausing between batches...');
        await this.delay(10000);
      }
    }
    
    return results;
  }

  async searchPopularDomains(count: number = 20): Promise<DomainSearchResult[]> {
    console.log(`🔥 Searching for mentions of ${count} random .skr domains...`);
    
    // Get a random sample of domains
    const allDomains = await this.domainDumper.fetchAllSkrDomains();
    const shuffled = allDomains.sort(() => 0.5 - Math.random());
    const sampleDomains = shuffled.slice(0, count).map(d => d.domain);
    
    if (sampleDomains.length === 0) {
      console.log('❌ No domains available for sampling');
      return [];
    }
    
    return await this.searchSpecificDomains(sampleDomains, 4);
  }

  async saveResults(results: DomainSearchResult[]): Promise<void> {
    const resultsFile = path.join(this.outputDir, 'domain_search_results.json');
    const summaryFile = path.join(this.outputDir, 'domain_search_summary.json');
    
    // Save full results
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    
    // Create summary
    const summary = {
      totalDomains: results.length,
      domainsWithMentions: results.filter(r => r.totalMentions > 0).length,
      totalMentions: results.reduce((sum, r) => sum + r.totalMentions, 0),
      totalUniqueUsers: new Set(
        results.flatMap(r => r.mentions.map(m => m.username))
      ).size,
      topDomains: results
        .filter(r => r.totalMentions > 0)
        .sort((a, b) => b.totalMentions - a.totalMentions)
        .slice(0, 10)
        .map(r => ({
          domain: r.domain,
          mentions: r.totalMentions,
          users: r.uniqueUsers
        })),
      lastUpdated: new Date().toISOString(),
      searchProgress: this.progress
    };
    
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    
    console.log(`💾 Results saved to ${resultsFile}`);
    console.log(`📊 Summary saved to ${summaryFile}`);
  }

  loadExistingResults(): DomainSearchResult[] {
    const resultsFile = path.join(this.outputDir, 'domain_search_results.json');
    
    if (fs.existsSync(resultsFile)) {
      try {
        return JSON.parse(fs.readFileSync(resultsFile, 'utf-8'));
      } catch (error) {
        console.error('Error loading existing results:', error);
      }
    }
    
    return [];
  }

  getTopMentionedDomains(limit: number = 10): DomainSearchResult[] {
    const results = this.loadExistingResults();
    
    return results
      .filter(r => r.totalMentions > 0)
      .sort((a, b) => b.totalMentions - a.totalMentions)
      .slice(0, limit);
  }

  getDomainMentionsByUser(username: string): DomainMention[] {
    const results = this.loadExistingResults();
    
    return results.flatMap(r => 
      r.mentions.filter(m => m.username.toLowerCase() === username.toLowerCase())
    );
  }

  private printProgress(): void {
    const elapsed = (Date.now() - this.progress.startTime.getTime()) / 1000;
    const rate = this.progress.domainsProcessed / elapsed * 60; // domains per minute
    const remaining = this.progress.totalDomains - this.progress.domainsProcessed;
    const eta = remaining / rate; // minutes
    
    console.log(`📈 Progress: ${this.progress.domainsProcessed}/${this.progress.totalDomains} domains`);
    console.log(`   Rate: ${rate.toFixed(1)} domains/min | ETA: ${eta.toFixed(1)} min`);
    console.log(`   Mentions found: ${this.progress.mentionsFound}`);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  printSummary(): void {
    const results = this.loadExistingResults();
    
    if (results.length === 0) {
      console.log('No search results found. Run a search first.');
      return;
    }
    
    const withMentions = results.filter(r => r.totalMentions > 0);
    const totalMentions = results.reduce((sum, r) => sum + r.totalMentions, 0);
    const uniqueUsers = new Set(results.flatMap(r => r.mentions.map(m => m.username))).size;
    
    console.log('\n🎯 === Domain-Specific Search Summary ===');
    console.log(`Domains searched: ${results.length}`);
    console.log(`Domains with mentions: ${withMentions.length} (${(withMentions.length / results.length * 100).toFixed(1)}%)`);
    console.log(`Total mentions found: ${totalMentions}`);
    console.log(`Unique users: ${uniqueUsers}`);
    
    if (withMentions.length > 0) {
      console.log('\n🏆 Top mentioned domains:');
      const top = withMentions
        .sort((a, b) => b.totalMentions - a.totalMentions)
        .slice(0, 5);
      
      top.forEach((result, index) => {
        console.log(`${index + 1}. ${result.domain}: ${result.totalMentions} mentions (${result.uniqueUsers} users)`);
      });
    }
  }
}