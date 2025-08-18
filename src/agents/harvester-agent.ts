import { SolanaDomainDumper } from '../integrations/solana-domain-dumper';
import { DomainScout } from '../services/domain-scout';
import Config from '../config/config';
import * as fs from 'fs';
import * as path from 'path';

export class ScoutAgent {
  private domainDumper: SolanaDomainDumper;
  private domainScout: DomainScout;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.domainDumper = new SolanaDomainDumper(Config.solana.rpcUrl);
    this.domainScout = new DomainScout();
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
    
    console.log('🎯 Starting full scout flow: Get domains → Search → Analyze → User details → Analytics...');
    try {
      const results = await this.domainScout.scoutAllRegisteredDomains();
      console.log(`\n✅ Scout completed! Found ${results.totalMentions} mentions across ${results.domainsWithMentions} domains`);
      this.domainScout.printSummary(results);
    } catch (error) {
      console.error('Error scouting registered domains:', error);
    }
  }

  async scoutSpecificDomains(domains: string[]): Promise<void> {
    console.log(`🎯 Scouting specific domains with full flow: ${domains.join(', ')}`);
    try {
      const results = await this.domainScout.scoutDomains(domains);
      console.log(`\n✅ Scout completed! Found ${results.totalMentions} mentions across ${results.domainsWithMentions} domains`);
      this.domainScout.printSummary(results);
    } catch (error) {
      console.error('Error scouting specific domains:', error);
    }
  }

  async getStatistics(): Promise<void> {
    console.log('\n=== Latest Scout Statistics ===');
    
    // Try to load latest results
    const latestFile = path.join(Config.output.directory, 'latest-scout-results.json');
    
    if (fs.existsSync(latestFile)) {
      try {
        const results = JSON.parse(fs.readFileSync(latestFile, 'utf-8'));
        this.domainScout.printSummary(results);
      } catch (error) {
        console.log('No previous scout results found. Run a scout first.');
      }
    } else {
      console.log('No previous scout results found. Run a scout first.');
    }
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


export default ScoutAgent;