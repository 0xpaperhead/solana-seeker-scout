interface DomainMention {
  domain: string;
  username: string;
  userId?: string;
  followers?: number;
  tweetId: string;
  tweetText: string;
  timestamp: string;
}

export class SkrDomainScanner {
  private readonly domainPattern = /([^\s\u3000「」『』（）()[\]{}<>.,;:!?'"]+\.skr)/gi;
  
  extractDomainsFromText(text: string): string[] {
    const domains: string[] = [];
    let match;
    
    this.domainPattern.lastIndex = 0;
    
    while ((match = this.domainPattern.exec(text)) !== null) {
      let domain = match[1];
      
      // Clean up common prefixes
      domain = domain.replace(/^(https?:\/\/|\/\/|@)/, '');
      
      // Convert to lowercase for consistency (but preserve original characters)
      const cleanDomain = domain.toLowerCase();
      
      if (!domains.includes(cleanDomain) && this.validateDomain(cleanDomain)) {
        domains.push(cleanDomain);
      }
    }
    
    return domains;
  }

  validateDomain(domain: string): boolean {
    if (!domain.endsWith('.skr')) return false;
    
    const parts = domain.split('.');
    if (parts.length < 2) return false;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (part.length === 0) return false;
      // Allow Unicode characters but exclude obvious invalid characters
      if (/[\s\u3000「」『』（）()[\]{}<>.,;:!?'"]/.test(part)) return false;
    }
    
    return true;
  }

  scanTweetForDomains(tweet: any): DomainMention[] {
    const mentions: DomainMention[] = [];
    const domains = this.extractDomainsFromText(tweet.text);
    
    for (const domain of domains) {
      if (this.validateDomain(domain)) {
        mentions.push({
          domain,
          username: tweet.username || '',
          userId: tweet.author_id,
          tweetId: tweet.id,
          tweetText: tweet.text,
          timestamp: tweet.created_at || new Date().toISOString()
        });
      }
    }
    
    return mentions;
  }

  scanMultipleTweets(tweets: any[]): DomainMention[] {
    const allMentions: DomainMention[] = [];
    
    for (const tweet of tweets) {
      const mentions = this.scanTweetForDomains(tweet);
      allMentions.push(...mentions);
    }
    
    return allMentions;
  }

  deduplicateMentions(mentions: DomainMention[]): DomainMention[] {
    const uniqueMap = new Map<string, DomainMention>();
    
    for (const mention of mentions) {
      const key = `${mention.username}_${mention.domain}`;
      
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, mention);
      } else {
        const existing = uniqueMap.get(key)!;
        if (!existing.timestamp || mention.timestamp > existing.timestamp) {
          uniqueMap.set(key, mention);
        }
      }
    }
    
    return Array.from(uniqueMap.values());
  }

  generateSearchQueries(): string[] {
    const queries = [
      '.skr',
      '".skr"',
      'skr domain',
      'solana mobile .skr',
      'my .skr domain',
      'bought .skr',
      'registered .skr',
      '.skr wallet',
      '.skr address'
    ];
    
    return queries;
  }

  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export { DomainMention };