import { ScoutAgent } from './agents/harvester-agent';
import * as readline from 'readline';

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

  console.log('🚀 Starting Solana .skr Domain Scout...');
  showMenu();
  promptUser();
}

if (require.main === module) {
  main().catch(console.error);
}