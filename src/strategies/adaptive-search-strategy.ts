import { LocalIntelligentGenerator, SearchQueriesResponse } from './local-intelligent-generator';
import { DomainMention } from '../scanners/domain-scanner';

interface SearchContext {
  previousQueries: string[];
  foundDomains: string[];
  successfulQueries: string[];
  failedQueries: string[];
  totalResults: number;
  currentHour: number;
  lastSuccessfulSearch: Date | null;
  averageResultsPerQuery: number;
  trendsContext?: string;
}


interface SearchMetrics {
  queryPerformance: Map<string, number>;
  domainPopularity: Map<string, number>;
}

export class AdaptiveSearchStrategy {
  private localGenerator: LocalIntelligentGenerator;
  private searchContext: SearchContext;
  private metrics: SearchMetrics;

  constructor() {
    this.localGenerator = new LocalIntelligentGenerator();
    this.searchContext = {
      previousQueries: [],
      foundDomains: [],
      successfulQueries: [],
      failedQueries: [],
      totalResults: 0,
      currentHour: new Date().getHours(),
      lastSuccessfulSearch: null,
      averageResultsPerQuery: 0
    };
    this.metrics = {
      queryPerformance: new Map(),
      domainPopularity: new Map()
    };
  }

  async getNextSearchQueries(mentions: DomainMention[] = []): Promise<string[]> {
    this.updateContext(mentions);
    
    const strategy = this.determineSearchStrategy();
    console.log(`Using search strategy: ${strategy}`);

    let queriesResponse: SearchQueriesResponse;

    switch (strategy) {
      case 'diversify':
        queriesResponse = await this.getDiversificationQueries();
        break;
      case 'exploit':
        queriesResponse = await this.getExploitationQueries();
        break;
      case 'trend-surf':
        queriesResponse = await this.getTrendSurfingQueries();
        break;
      case 'time-optimize':
        queriesResponse = await this.getTimeOptimizedQueries();
        break;
      case 'user-target':
        queriesResponse = await this.getUserTargetedQueries();
        break;
      default:
        queriesResponse = await this.getBalancedQueries();
    }

    // Update query tracking
    queriesResponse.search_queries.forEach(query => {
      this.searchContext.previousQueries.push(query);
    });

    return queriesResponse.search_queries;
  }

  private updateContext(mentions: DomainMention[]): void {
    this.searchContext.currentHour = new Date().getHours();
    this.searchContext.totalResults += mentions.length;
    
    if (mentions.length > 0) {
      this.searchContext.lastSuccessfulSearch = new Date();
      mentions.forEach(mention => {
        if (!this.searchContext.foundDomains.includes(mention.domain)) {
          this.searchContext.foundDomains.push(mention.domain);
        }
        this.metrics.domainPopularity.set(
          mention.domain,
          (this.metrics.domainPopularity.get(mention.domain) || 0) + 1
        );
      });
    }

    // Calculate average results per query
    const totalQueries = this.searchContext.previousQueries.length;
    this.searchContext.averageResultsPerQuery = totalQueries > 0 
      ? this.searchContext.totalResults / totalQueries 
      : 0;
  }

  private determineSearchStrategy(): string {
    const recentSuccessRate = this.calculateRecentSuccessRate();

    // If we're getting good results, exploit the pattern
    if (recentSuccessRate > 0.6 && this.searchContext.totalResults > 10) {
      return 'exploit';
    }

    // If we haven't found much, diversify
    if (recentSuccessRate < 0.3) {
      return 'diversify';
    }

    return 'balanced';
  }

  private calculateRecentSuccessRate(): number {
    const recentQueries = this.searchContext.previousQueries.slice(-10);
    const recentSuccessful = recentQueries.filter(query => 
      this.searchContext.successfulQueries.includes(query)
    );
    
    return recentQueries.length > 0 ? recentSuccessful.length / recentQueries.length : 0;
  }

  private async getDiversificationQueries(): Promise<SearchQueriesResponse> {
    return await this.localGenerator.generateQueries({
      ...this.searchContext,
      trendsContext: 'Diversification strategy: exploring new search angles and untapped niches'
    });
  }

  private async getExploitationQueries(): Promise<SearchQueriesResponse> {
    const successfulPatterns = this.analyzeSuccessfulPatterns();
    
    return await this.localGenerator.generateQueries({
      ...this.searchContext,
      trendsContext: `Exploitation strategy: building on successful patterns: ${successfulPatterns.join(', ')}`
    });
  }

  private async getTrendSurfingQueries(): Promise<SearchQueriesResponse> {
    // In a real implementation, you'd fetch current Twitter trends
    const mockTrends = ['Solana', 'crypto', 'NFT', 'mobile', 'blockchain', 'DeFi'];
    
    return await this.localGenerator.generateTrendAwareQueries(mockTrends);
  }

  private async getTimeOptimizedQueries(): Promise<SearchQueriesResponse> {
    const bestPerformingHour = this.getBestPerformingTimeWindow();
    
    return await this.localGenerator.generateQueries({
      ...this.searchContext,
      trendsContext: `Time optimization: targeting queries effective during hour ${bestPerformingHour}`
    });
  }

  private async getUserTargetedQueries(): Promise<SearchQueriesResponse> {
    const userProfiles = this.analyzeUserProfiles();
    
    return await this.localGenerator.generateUserTypeQueries(userProfiles);
  }

  private async getBalancedQueries(): Promise<SearchQueriesResponse> {
    return await this.localGenerator.generateQueries({
      ...this.searchContext,
      trendsContext: 'Balanced strategy: mixing proven and experimental approaches'
    });
  }

  private analyzeSuccessfulPatterns(): string[] {
    const patterns: string[] = [];
    
    // Analyze successful queries for common patterns
    for (const query of this.searchContext.successfulQueries) {
      if (query.includes('#')) patterns.push('hashtag-based');
      if (query.includes('@')) patterns.push('mention-based');
      if (query.includes('"')) patterns.push('exact-phrase');
      if (/[^\x20-\x7F]/.test(query)) patterns.push('non-english');
      if (query.includes('.skr')) patterns.push('direct-domain');
    }
    
    return [...new Set(patterns)];
  }

  private getBestPerformingTimeWindow(): number {
    // Simplified: return current hour
    return this.searchContext.currentHour;
  }

  private analyzeUserProfiles(): {
    developers: number;
    traders: number;
    gamers: number;
    nftCollectors: number;
  } {
    // Analyze found domains and tweets to categorize users
    const profiles = {
      developers: 0,
      traders: 0,
      gamers: 0,
      nftCollectors: 0
    };

    for (const domain of this.searchContext.foundDomains) {
      if (domain.includes('dev') || domain.includes('code') || domain.includes('build')) {
        profiles.developers++;
      } else if (domain.includes('trade') || domain.includes('dex') || domain.includes('swap')) {
        profiles.traders++;
      } else if (domain.includes('game') || domain.includes('play') || domain.includes('win')) {
        profiles.gamers++;
      } else if (domain.includes('nft') || domain.includes('art') || domain.includes('collect')) {
        profiles.nftCollectors++;
      }
    }

    return profiles;
  }

  recordQueryResult(query: string, resultCount: number): void {
    this.metrics.queryPerformance.set(query, resultCount);
    
    if (resultCount > 0) {
      if (!this.searchContext.successfulQueries.includes(query)) {
        this.searchContext.successfulQueries.push(query);
      }
    } else {
      if (!this.searchContext.failedQueries.includes(query)) {
        this.searchContext.failedQueries.push(query);
      }
    }

    // Simplified: no time-based tracking
  }

  getSearchMetrics(): SearchMetrics {
    return {
      queryPerformance: new Map(this.metrics.queryPerformance),
      domainPopularity: new Map(this.metrics.domainPopularity)
    };
  }

  getSearchContext(): SearchContext {
    return { ...this.searchContext };
  }

  saveState(): any {
    return {
      searchContext: this.searchContext,
      metrics: {
        queryPerformance: Array.from(this.metrics.queryPerformance.entries()),
        domainPopularity: Array.from(this.metrics.domainPopularity.entries())
      }
    };
  }

  loadState(state: any): void {
    if (state.searchContext) {
      this.searchContext = { ...state.searchContext };
      if (this.searchContext.lastSuccessfulSearch) {
        this.searchContext.lastSuccessfulSearch = new Date(this.searchContext.lastSuccessfulSearch);
      }
    }
    
    if (state.metrics) {
      this.metrics.queryPerformance = new Map(state.metrics.queryPerformance || []);
      // Simplified: no complex metrics to restore
      this.metrics.domainPopularity = new Map(state.metrics.domainPopularity || []);
    }
  }
}