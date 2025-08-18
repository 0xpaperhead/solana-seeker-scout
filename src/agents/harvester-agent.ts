import { SolanaDomainDumper } from '../integrations/solana-domain-dumper';
import { DomainSpecificSearch } from '../scanners/domain-specific-search';
import Config from '../config/config';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

export class ScoutAgent {
  private domainDumper: SolanaDomainDumper;
  private domainSearch: DomainSpecificSearch;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.domainDumper = new SolanaDomainDumper(Config.solana.rpcUrl);
    this.domainSearch = new DomainSpecificSearch(Config.rapidapi.key, Config.solana.rpcUrl);
  }

  async startContinuousScout(intervalMinutes: number = 30): Promise<void> {
    if (this.isRunning) {
      console.log('Scout is already running');
      return;
    }

    this.isRunning = true;
    console.log(`Starting continuous scout with ${intervalMinutes} minute intervals`);

    const runScout = async () => {
      if (!this.isRunning) return;
      
      console.log(`\n[${new Date().toISOString()}] Starting scout cycle...`);
      
      try {
        await this.scoutRegisteredDomains();
      } catch (error) {
        console.error('Error in scout cycle:', error);
      }
      
      if (this.isRunning) {
        console.log(`Next scout in ${intervalMinutes} minutes...`);
      }
    };

    await runScout();

    this.intervalId = setInterval(runScout, intervalMinutes * 60 * 1000);
  }

  stopScout(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Scout stopped');
  }

  private isDomainDumpRecent(): boolean {
    const domainFile = path.join(Config.output.directory, 'solana_domains.json');
    
    if (!fs.existsSync(domainFile)) {
      return false;
    }
    
    const stats = fs.statSync(domainFile);
    const cacheThreshold = Date.now() - (Config.scout.domainCacheMinutes * 60 * 1000);
    return stats.mtime.getTime() > cacheThreshold;
  }

  async scoutRegisteredDomains(): Promise<void> {
    if (this.isDomainDumpRecent()) {
      console.log(`📋 Using recent domain dump (less than ${Config.scout.domainCacheMinutes} minutes old)`);
    } else {
      console.log('🔄 Refreshing registered domains from blockchain...');
      await this.dumpRegisteredDomains();
    }
    
    console.log('🎯 Scouting Twitter for registered .skr domain mentions...');
    try {
      const results = await this.domainSearch.searchAllRegisteredDomains(20);
      console.log(`\n✅ Found mentions for ${results.filter(r => r.totalMentions > 0).length} domains`);
      this.domainSearch.printSummary();
    } catch (error) {
      console.error('Error scouting registered domains:', error);
    }
  }

  async scoutSpecificDomains(domains: string[]): Promise<void> {
    console.log(`🎯 Scouting specific domains: ${domains.join(', ')}`);
    try {
      const results = await this.domainSearch.searchSpecificDomains(domains, 4);
      const foundMentions = results.filter(r => r.totalMentions > 0);
      
      console.log(`\n✅ Found mentions for ${foundMentions.length}/${domains.length} domains`);
      
      if (foundMentions.length > 0) {
        console.log('\n🎯 Results:');
        foundMentions.forEach(result => {
          console.log(`  ${result.domain}: ${result.totalMentions} mentions from ${result.uniqueUsers} users`);
        });
      }
    } catch (error) {
      console.error('Error scouting specific domains:', error);
    }
  }

  getStatistics(): void {
    console.log('\n=== Scout Statistics ===');
    this.domainSearch.printSummary();
  }


  async dumpRegisteredDomains(): Promise<void> {
    console.log('🔄 Dumping registered .skr domains from Solana...');
    try {
      const domains = await this.domainDumper.dumpAllDomains();
      this.domainDumper.getStats(domains);
    } catch (error) {
      console.error('Error dumping domains:', error);
    }
  }

}

async function main() {
  const agent = new ScoutAgent();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const showMenu = () => {
    console.log('\n=== Solana .skr Domain Scout ===');
    console.log('1. Scout registered domains');
    console.log('2. Scout specific domains');
    console.log('3. Start continuous scouting');
    console.log('4. Dump registered domains');
    console.log('5. Show statistics');
    console.log('6. Stop scouting');
    console.log('7. Exit');
    console.log('===============================');
  };

  const promptUser = () => {
    rl.question('\nSelect an option (1-7): ', async (answer) => {
      switch (answer.trim()) {
        case '1':
          await agent.scoutRegisteredDomains();
          promptUser();
          break;

        case '2':
          rl.question('Enter domains separated by commas (e.g., wallet.skr, nft.skr): ', async (domains) => {
            const domainList = domains.split(',').map(d => d.trim()).filter(d => d);
            if (domainList.length > 0) {
              await agent.scoutSpecificDomains(domainList);
            } else {
              console.log('No valid domains provided');
            }
            promptUser();
          });
          break;

        case '3':
          rl.question('Enter interval in minutes (default 30): ', async (interval) => {
            const minutes = parseInt(interval) || 30;
            await agent.startContinuousScout(minutes);
            promptUser();
          });
          break;

        case '4':
          await agent.dumpRegisteredDomains();
          promptUser();
          break;

        case '5':
          agent.getStatistics();
          promptUser();
          break;

        case '6':
          agent.stopScout();
          promptUser();
          break;

        case '7':
          agent.stopScout();
          console.log('Goodbye!');
          rl.close();
          process.exit(0);

        default:
          console.log('Invalid option');
          promptUser();
      }
    });
  };

  showMenu();
  promptUser();
}

if (require.main === module) {
  main().catch(console.error);
}

export default ScoutAgent;