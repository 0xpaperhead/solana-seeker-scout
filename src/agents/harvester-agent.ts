import { DataScout } from './data-scout';
import { SolanaDomainDumper } from '../integrations/solana-domain-dumper';
import { DomainSpecificSearch } from '../scanners/domain-specific-search';
import * as dotenv from 'dotenv';
import * as readline from 'readline';
import * as path from 'path';

// Load .env from project root - works from both project root and solana-seeker-scout directory
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

export class ScoutAgent {
  private scout: DataScout;
  private domainDumper: SolanaDomainDumper;
  private domainSearch: DomainSpecificSearch;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    const apiKey = process.env.RAPIDAPI_KEY || '';
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    
    if (!apiKey) {
      throw new Error('Twitter API key not found. Please set RAPIDAPI_KEY in .env file');
    }

    this.scout = new DataScout(apiKey);
    this.domainDumper = new SolanaDomainDumper(rpcUrl);
    this.domainSearch = new DomainSpecificSearch(apiKey, rpcUrl);
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
        await this.scout.runScoutCycle();
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

  async runSingleScout(): Promise<void> {
    console.log('Running single scout cycle...');
    await this.scout.runScoutCycle();
  }

  async scoutSpecificDomains(domains: string[]): Promise<void> {
    console.log(`Scouting specific domains: ${domains.join(', ')}`);
    await this.scout.scoutSpecificDomains(domains);
  }

  async scoutFromUsers(usernames: string[]): Promise<void> {
    console.log(`Scouting from users: ${usernames.join(', ')}`);
    await this.scout.scoutFromUserList(usernames);
  }

  getStatistics(): void {
    const data = this.scout.getScoutedData();
    const topInfluencers = this.scout.getTopInfluencers(10);
    const domainStats = this.scout.getDomainStats();

    console.log('\n=== Current Statistics ===');
    console.log(`Total records: ${data.length}`);
    console.log(`Unique users: ${new Set(data.map((d: any) => d.username)).size}`);
    console.log(`Unique domains: ${new Set(data.map((d: any) => d.domain)).size}`);

    if (topInfluencers.length > 0) {
      console.log('\n=== Top 10 Influencers ===');
      topInfluencers.forEach((item: any, index: number) => {
        console.log(`${index + 1}. @${item.username}`);
        console.log(`   Followers: ${item.followers.toLocaleString()}`);
        console.log(`   Domain: ${item.domain}`);
        console.log(`   Tweet: ${item.tweetText.substring(0, 100)}...`);
      });
    }

    if (domainStats.size > 0) {
      console.log('\n=== Domain Statistics ===');
      const sortedDomains = Array.from(domainStats.entries())
        .sort((a: any, b: any) => b[1].totalFollowers - a[1].totalFollowers);
      
      sortedDomains.forEach(([domain, stats]: [any, any]) => {
        console.log(`${domain}:`);
        console.log(`   Mentions: ${stats.count}`);
        console.log(`   Total Reach: ${stats.totalFollowers.toLocaleString()} followers`);
        console.log(`   Avg Followers: ${Math.round(stats.totalFollowers / stats.count).toLocaleString()}`);
      });
    }
  }


  async dumpRegisteredDomains(_forceRefresh: boolean = false): Promise<void> {
    console.log('🔄 Dumping registered .skr domains from Solana...');
    try {
      const domains = await this.domainDumper.dumpAllDomains();
      this.domainDumper.getStats(domains);
    } catch (error) {
      console.error('Error dumping domains:', error);
    }
  }

  async searchRegisteredDomains(batchSize: number = 20): Promise<void> {
    console.log('🎯 Searching Twitter for registered .skr domain mentions...');
    try {
      const results = await this.domainSearch.searchAllRegisteredDomains(false, batchSize);
      console.log(`\n✅ Search completed! Found mentions for ${results.filter(r => r.totalMentions > 0).length} domains`);
    } catch (error) {
      console.error('Error searching registered domains:', error);
    }
  }

  async searchSampleDomains(count: number = 10): Promise<void> {
    console.log(`🎲 Searching ${count} random .skr domains...`);
    try {
      const results = await this.domainSearch.searchPopularDomains(count);
      console.log(`\n✅ Sample search completed! Found mentions for ${results.filter(r => r.totalMentions > 0).length} domains`);
    } catch (error) {
      console.error('Error searching sample domains:', error);
    }
  }

  showDomainSearchStats(): void {
    this.domainSearch.printSummary();
  }
}

async function main() {
  const agent = new ScoutAgent();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const showMenu = () => {
    console.log('\n=== Twitter .skr Domain Scout Agent ===');
    console.log('1. Run single scout cycle');
    console.log('2. Start continuous scouting');
    console.log('3. Scout specific domains');
    console.log('4. Scout from specific users');
    console.log('5. Show statistics');
    console.log('6. Stop continuous scouting');
    console.log('7. Dump registered .skr domains');
    console.log('8. Search registered domains');
    console.log('9. Search sample domains');
    console.log('10. Domain search statistics');
    console.log('11. Exit');
    console.log('=====================================');
  };

  const promptUser = () => {
    rl.question('\nSelect an option (1-11): ', async (answer) => {
      switch (answer.trim()) {
        case '1':
          await agent.runSingleScout();
          promptUser();
          break;

        case '2':
          rl.question('Enter interval in minutes (default 30): ', async (interval) => {
            const minutes = parseInt(interval) || 30;
            await agent.startContinuousScout(minutes);
            promptUser();
          });
          break;

        case '3':
          rl.question('Enter domains separated by commas (e.g., wallet.skr, nft.skr): ', async (domains) => {
            const domainList = domains.split(',').map(d => d.trim()).filter(d => d);
            if (domainList.length > 0) {
              await agent.scoutSpecificDomains(domainList);
            }
            promptUser();
          });
          break;

        case '4':
          rl.question('Enter usernames separated by commas (without @): ', async (users) => {
            const userList = users.split(',').map(u => u.trim()).filter(u => u);
            if (userList.length > 0) {
              await agent.scoutFromUsers(userList);
            }
            promptUser();
          });
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
          rl.question('Force refresh domains? (y/N): ', async (refresh) => {
            const forceRefresh = refresh.toLowerCase() === 'y' || refresh.toLowerCase() === 'yes';
            await agent.dumpRegisteredDomains(forceRefresh);
            promptUser();
          });
          break;

        case '8':
          rl.question('Enter batch size (default 20): ', async (batchSize) => {
            const size = parseInt(batchSize) || 20;
            await agent.searchRegisteredDomains(size);
            promptUser();
          });
          break;

        case '9':
          rl.question('Enter number of domains to sample (default 10): ', async (count) => {
            const sampleCount = parseInt(count) || 10;
            await agent.searchSampleDomains(sampleCount);
            promptUser();
          });
          break;

        case '10':
          agent.showDomainSearchStats();
          promptUser();
          break;

        case '11':
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