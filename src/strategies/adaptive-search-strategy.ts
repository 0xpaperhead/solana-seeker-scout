import { DomainMention } from '../scanners/domain-scanner';

interface SearchQueriesResponse {
  search_queries: string[];
  reasoning: string;
}

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
  private searchContext: SearchContext;
  private metrics: SearchMetrics;

  constructor() {
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
    const diversifyQueries = [
      'bought my .skr',
      'set up .skr',
      'minting with .skr',
      '.skr address book',
      'DeFi .skr wallet',
      'trading via .skr',
      '.skr mobile payments',
      'secured .skr domain',
      'crypto .skr username',
      'blockchain .skr identity'
    ];
    
    const filteredQueries = this.filterUsedQueries(diversifyQueries);
    
    return {
      search_queries: filteredQueries.slice(0, 6),
      reasoning: 'Diversification strategy: exploring new search angles and untapped niches'
    };
  }

  private async getExploitationQueries(): Promise<SearchQueriesResponse> {
    const successfulPatterns = this.analyzeSuccessfulPatterns();
    
    // Build variations of successful queries
    const exploitQueries: string[] = [];
    for (const query of this.searchContext.successfulQueries.slice(0, 3)) {
      if (query.includes('.skr')) {
        exploitQueries.push(`${query} wallet`);
        exploitQueries.push(`${query} domain`);
        exploitQueries.push(`new ${query}`);
      }
    }
    
    // Fallback to balanced queries if no successful patterns
    if (exploitQueries.length === 0) {
      exploitQueries.push('solana mobile .skr', '.skr wallet setup', 'registered .skr domain');
    }
    
    const filteredQueries = this.filterUsedQueries(exploitQueries);
    
    return {
      search_queries: filteredQueries.slice(0, 6),
      reasoning: `Exploitation strategy: building on successful patterns: ${successfulPatterns.join(', ')}`
    };
  }

  private async getTrendSurfingQueries(): Promise<SearchQueriesResponse> {
    // In a real implementation, you'd fetch current Twitter trends
    const mockTrends = ['Solana', 'crypto', 'NFT', 'mobile', 'blockchain', 'DeFi'];
    const trendQueries = mockTrends.slice(0, 4).map(trend => `${trend} .skr`);
    
    const filteredQueries = this.filterUsedQueries(trendQueries);
    
    return {
      search_queries: filteredQueries,
      reasoning: 'Trend-surfing strategy: combining trending topics with .skr domains'
    };
  }

  private async getTimeOptimizedQueries(): Promise<SearchQueriesResponse> {
    const bestPerformingHour = this.getBestPerformingTimeWindow();
    
    // Time-optimized queries based on current hour
    const currentHour = new Date().getHours();
    let timeQueries: string[] = [];
    
    if (currentHour >= 9 && currentHour <= 12) {
      timeQueries = ['morning .skr setup', 'daily .skr check', 'work with .skr'];
    } else if (currentHour >= 18 && currentHour <= 22) {
      timeQueries = ['evening .skr trade', 'tonight .skr mint', 'crypto .skr news'];
    } else {
      timeQueries = ['late night .skr', 'quiet .skr time', 'overnight .skr'];
    }
    
    const filteredQueries = this.filterUsedQueries(timeQueries);
    
    return {
      search_queries: filteredQueries,
      reasoning: `Time optimization: targeting queries effective during hour ${bestPerformingHour}`
    };
  }

  private async getUserTargetedQueries(): Promise<SearchQueriesResponse> {
    const userProfiles = this.analyzeUserProfiles();
    
    // Generate queries for underrepresented user types
    const queries: string[] = [];
    
    if (userProfiles.developers < userProfiles.traders) {
      queries.push('building on .skr', 'dev .skr domains', 'coding .skr');
    }
    if (userProfiles.traders < userProfiles.developers) {
      queries.push('trading .skr', '.skr price', 'buying .skr');
    }
    if (userProfiles.gamers < userProfiles.nftCollectors) {
      queries.push('gaming .skr', 'game .skr domain', 'esports .skr');
    }
    if (userProfiles.nftCollectors < userProfiles.gamers) {
      queries.push('NFT .skr', 'collecting .skr', 'mint .skr');
    }
    
    if (queries.length === 0) {
      queries.push('.skr wallet', '.skr domain', '.skr address');
    }
    
    const filteredQueries = this.filterUsedQueries(queries);
    
    return {
      search_queries: filteredQueries.slice(0, 6),
      reasoning: `User targeting: focusing on underrepresented segments`
    };
  }

  private async getBalancedQueries(): Promise<SearchQueriesResponse> {
    const balancedQueries = [
      'solana mobile .skr',
      '.skr wallet setup',
      'registered .skr domain',
      'claiming .skr',
      'my new .skr',
      '.skr blockchain'
    ];
    
    const filteredQueries = this.filterUsedQueries(balancedQueries);
    
    return {
      search_queries: filteredQueries,
      reasoning: 'Balanced strategy: proven reliable query patterns'
    };
  }

  private filterUsedQueries(queries: string[]): string[] {
    const usedQueries = new Set(this.searchContext.previousQueries);
    return queries.filter(query => !usedQueries.has(query));
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