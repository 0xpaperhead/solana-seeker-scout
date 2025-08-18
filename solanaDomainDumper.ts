import { Connection, PublicKey } from '@solana/web3.js';
import { findAllDomainsForTld, getNameOwner, findTldHouse } from '@onsol/tldparser';
import * as fs from 'fs';
import * as path from 'path';

interface SkrDomain {
  domain: string;
  owner: string;
  address: string;
  registrationTimestamp?: number;
}

interface DomainRegistry {
  domains: SkrDomain[];
  totalCount: number;
  lastUpdated: string;
  programAddress: string;
}

export class SolanaDomainDumper {
  private connection: Connection;
  private programId: PublicKey;
  private outputDir: string;

  constructor(rpcUrl: string, outputDir: string = './harvest-results') {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.programId = new PublicKey('TLDHkysf5pCnKsVA4gXpNvmy7psXLPEu4LAdDJthT9S');
    this.outputDir = outputDir;
    
    this.ensureOutputDirectory();
  }

  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async fetchAllSkrDomains(): Promise<SkrDomain[]> {
    console.log('🔍 Fetching all .skr domains from Solana AllDomain TLD House Program...');
    
    try {
      const tldString = "skr"; // Without the dot for the SDK
      
      console.log(`Finding TLD house for: ${tldString}`);
      
      // First, find the TLD house for .skr
      const [tldHouseKey] = findTldHouse(tldString);
      console.log(`TLD House Key: ${tldHouseKey.toString()}`);
      
      // Use the official @onsol/tldparser SDK to get all domains for this TLD
      const domainAccounts = await findAllDomainsForTld(this.connection, tldHouseKey);
      
      console.log(`Found ${domainAccounts.length} .skr domain account records`);

      const domains: SkrDomain[] = [];

      for (const domainKey of domainAccounts) {
        try {
          // domainAccounts contains an array of PublicKey objects
          
          // Get owner information
          let owner = 'unknown';
          try {
            const ownerResult = await getNameOwner(this.connection, domainKey);
            owner = ownerResult?.toString() || 'unknown';
          } catch (ownerError) {
            console.warn(`Could not fetch owner for domain key ${domainKey.toString()}:`, ownerError);
          }

          // For now, create a placeholder domain name
          // We'll need to implement proper domain name resolution later
          const domainName = `domain-${domainKey.toString().substring(0, 8)}.skr`;

          domains.push({
            domain: domainName,
            owner: owner,
            address: domainKey.toString(),
            registrationTimestamp: undefined
          });

        } catch (error) {
          console.error(`Error processing domain account:`, error);
        }
      }

      console.log(`✅ Successfully processed ${domains.length} .skr domains`);
      return domains;
    } catch (error) {
      console.error('Error fetching domains:', error);
      throw error;
    }
  }


  async saveDomains(domains: SkrDomain[]): Promise<void> {
    const registry: DomainRegistry = {
      domains,
      totalCount: domains.length,
      lastUpdated: new Date().toISOString(),
      programAddress: this.programId.toString()
    };

    const domainsFile = path.join(this.outputDir, 'domains.json');
    const domainsListFile = path.join(this.outputDir, 'domains_list.json');
    
    // Save full registry
    fs.writeFileSync(domainsFile, JSON.stringify(registry, null, 2));
    
    // Save simple domain list for easy consumption
    const domainList = domains.map(d => d.domain);
    fs.writeFileSync(domainsListFile, JSON.stringify(domainList, null, 2));
    
    console.log(`💾 Saved ${domains.length} domains to:`);
    console.log(`   - ${domainsFile}`);
    console.log(`   - ${domainsListFile}`);
  }

  async loadExistingDomains(): Promise<SkrDomain[]> {
    const domainsFile = path.join(this.outputDir, 'domains.json');
    
    if (fs.existsSync(domainsFile)) {
      try {
        const registry: DomainRegistry = JSON.parse(fs.readFileSync(domainsFile, 'utf-8'));
        console.log(`📂 Loaded ${registry.domains.length} existing domains from cache`);
        console.log(`   Last updated: ${registry.lastUpdated}`);
        return registry.domains;
      } catch (error) {
        console.error('Error loading existing domains:', error);
      }
    }
    
    return [];
  }

  async dumpDomains(forceRefresh: boolean = false): Promise<SkrDomain[]> {
    if (!forceRefresh) {
      const existingDomains = await this.loadExistingDomains();
      if (existingDomains.length > 0) {
        const lastUpdated = this.getLastUpdateTime();
        const hoursSinceUpdate = lastUpdated ? (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60) : 24;
        
        if (hoursSinceUpdate < 24) {
          console.log(`⏰ Using cached domains (${hoursSinceUpdate.toFixed(1)} hours old)`);
          return existingDomains;
        }
      }
    }

    console.log('🔄 Fetching fresh domain data...');
    const domains = await this.fetchAllSkrDomains();
    await this.saveDomains(domains);
    
    return domains;
  }

  private getLastUpdateTime(): Date | null {
    const domainsFile = path.join(this.outputDir, 'domains.json');
    
    if (fs.existsSync(domainsFile)) {
      try {
        const registry: DomainRegistry = JSON.parse(fs.readFileSync(domainsFile, 'utf-8'));
        return new Date(registry.lastUpdated);
      } catch (error) {
        return null;
      }
    }
    
    return null;
  }

  getDomainStats(domains: SkrDomain[]): void {
    console.log('\n📊 === Domain Statistics ===');
    console.log(`Total .skr domains: ${domains.length}`);
    
    // Owner distribution
    const ownerCounts = new Map<string, number>();
    domains.forEach(domain => {
      ownerCounts.set(domain.owner, (ownerCounts.get(domain.owner) || 0) + 1);
    });
    
    console.log(`Unique owners: ${ownerCounts.size}`);
    
    // Top domain holders
    const topHolders = Array.from(ownerCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    if (topHolders.length > 0) {
      console.log('\n🏆 Top domain holders:');
      topHolders.forEach(([owner, count], index) => {
        console.log(`${index + 1}. ${owner.substring(0, 8)}...${owner.slice(-8)}: ${count} domains`);
      });
    }
    
    // Domain length distribution
    const lengthDist = new Map<number, number>();
    domains.forEach(domain => {
      const length = domain.domain.replace('.skr', '').length;
      lengthDist.set(length, (lengthDist.get(length) || 0) + 1);
    });
    
    console.log('\n📏 Domain length distribution:');
    Array.from(lengthDist.entries())
      .sort((a, b) => a[0] - b[0])
      .forEach(([length, count]) => {
        console.log(`${length} chars: ${count} domains`);
      });
    
    // Recent registrations (if timestamp available)
    const withTimestamps = domains.filter(d => d.registrationTimestamp);
    if (withTimestamps.length > 0) {
      const recent = withTimestamps
        .sort((a, b) => (b.registrationTimestamp || 0) - (a.registrationTimestamp || 0))
        .slice(0, 5);
      
      console.log('\n⏰ Most recent registrations:');
      recent.forEach((domain, index) => {
        const date = new Date((domain.registrationTimestamp || 0) * 1000);
        console.log(`${index + 1}. ${domain.domain} - ${date.toLocaleDateString()}`);
      });
    }
  }

  async getRandomDomainSample(count: number = 10): Promise<string[]> {
    const domains = await this.loadExistingDomains();
    const shuffled = domains.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).map(d => d.domain);
  }

  async getDomainsByOwner(ownerAddress: string): Promise<SkrDomain[]> {
    const domains = await this.loadExistingDomains();
    return domains.filter(d => d.owner === ownerAddress);
  }
}