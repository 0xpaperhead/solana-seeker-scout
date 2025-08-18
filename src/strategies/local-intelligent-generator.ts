interface SearchQueriesResponse {
  search_queries: string[];
  reasoning: string;
}

export class LocalIntelligentGenerator {
  
  async generateQueries(context: {
    previousQueries: string[];
    foundDomains: string[];
    successfulQueries: string[];
    failedQueries: string[];
    totalResults: number;
    currentHour: number;
    trendsContext?: string;
  }): Promise<SearchQueriesResponse> {
    
    console.log(`🧠 Local AI Strategy: ${context.trendsContext}`);
    
    // Determine strategy based on context
    const strategy = this.determineStrategy(context);
    const queries = this.generateQueriesForStrategy(strategy, context);
    
    return {
      search_queries: queries,
      reasoning: `Local AI Strategy: ${strategy}. Generated ${queries.length} queries based on performance metrics and context.`
    };
  }

  private determineStrategy(context: any): string {
    const hoursSinceLastSuccess = context.lastSuccessfulSearch 
      ? (Date.now() - new Date(context.lastSuccessfulSearch).getTime()) / (1000 * 60 * 60)
      : 24;

    const successRate = context.previousQueries.length > 0 
      ? context.successfulQueries.length / context.previousQueries.length 
      : 0;

    if (successRate > 0.6 && context.totalResults > 10) return 'exploit';
    if (hoursSinceLastSuccess > 4 || successRate < 0.2) return 'diversify';
    if (context.currentHour >= 9 && context.currentHour <= 12) return 'peak-morning';
    if (context.currentHour >= 18 && context.currentHour <= 22) return 'peak-evening';
    return 'balanced';
  }

  private generateQueriesForStrategy(strategy: string, context: any): string[] {
    const usedQueries = new Set(context.previousQueries);
    
    const strategyQueries: { [key: string]: string[] } = {
      exploit: this.getExploitQueries(context),
      diversify: this.getDiversifyQueries(context),
      balanced: this.getBalancedQueries()
    };

    const allQueries = strategyQueries[strategy] || strategyQueries.balanced;
    
    // Filter out already used queries
    const freshQueries = allQueries.filter((q: string) => !usedQueries.has(q));
    
    return freshQueries.slice(0, 6);
  }

  private getExploitQueries(context: any): string[] {
    const successful = context.successfulQueries;
    const variations = [];
    
    for (const query of successful.slice(0, 3)) {
      if (query.includes('.skr')) {
        variations.push(`${query} wallet`);
        variations.push(`${query} domain`);
        variations.push(`new ${query}`);
      }
    }
    
    return variations.length > 0 ? variations : this.getBalancedQueries();
  }

  private getDiversifyQueries(_context: any): string[] {
    const creative = [
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
    
    return this.shuffleArray(creative);
  }


  private getBalancedQueries(): string[] {
    return [
      'solana mobile .skr',
      '.skr wallet setup',
      'registered .skr domain',
      'claiming .skr',
      'my new .skr',
      '.skr blockchain'
    ];
  }

  async generateTrendAwareQueries(currentTrends: string[]): Promise<SearchQueriesResponse> {
    const trendQueries = currentTrends.slice(0, 4).map(trend => `${trend} .skr`);
    
    return {
      search_queries: trendQueries,
      reasoning: `Local trend analysis: Combined trending topics with .skr domains`
    };
  }

  async generateUserTypeQueries(userProfiles: {
    developers: number;
    traders: number;
    gamers: number;
    nftCollectors: number;
  }): Promise<SearchQueriesResponse> {
    const total = Object.values(userProfiles).reduce((sum, count) => sum + count, 0);
    const underrepresented = Object.entries(userProfiles)
      .filter(([_, count]) => count < total / 4)
      .map(([type, _]) => type);

    const queries = underrepresented.flatMap(type => {
      switch (type) {
        case 'developers':
          return ['building on .skr', 'dev .skr domains', 'coding .skr'];
        case 'traders':
          return ['trading .skr', '.skr price', 'buying .skr'];
        case 'gamers':
          return ['gaming .skr', 'game .skr domain', 'esports .skr'];
        case 'nftCollectors':
          return ['NFT .skr', 'collecting .skr', 'mint .skr'];
        default:
          return ['.skr domain'];
      }
    });

    return {
      search_queries: queries.slice(0, 6),
      reasoning: `Local user analysis: Targeting underrepresented segments - ${underrepresented.join(', ')}`
    };
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

export { SearchQueriesResponse };