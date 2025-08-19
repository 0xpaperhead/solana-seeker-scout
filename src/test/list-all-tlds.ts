import { getAllTld } from "@onsol/tldparser";
import { Connection } from "@solana/web3.js";
import Config from '../config/config';

async function listAllTlds() {
  console.log('🔍 Fetching all registered TLDs on Solana...\n');
  
  const connection = new Connection(Config.solana.rpcUrl);
  
  try {
    const allTlds = await getAllTld(connection);
    
    console.log(`📊 Found ${allTlds.length} registered TLDs:\n`);
    console.log('='.repeat(70));
    console.log(`${'TLD'.padEnd(15)} | ${'Parent Account'.padEnd(50)}`);
    console.log('='.repeat(70));
    
    // Sort TLDs alphabetically
    const sortedTlds = allTlds.sort((a, b) => String(a.tld).localeCompare(String(b.tld)));
    
    sortedTlds.forEach(tld => {
      console.log(`${tld.tld.padEnd(15)} | ${tld.parentAccount.toString()}`);
    });
    
    console.log('='.repeat(70));
    console.log(`\n📈 Summary:`);
    console.log(`   Total TLDs: ${allTlds.length}`);
    
    // Group by TLD length/type
    const singleChar = allTlds.filter(t => t.tld.length === 2); // .x format
    const twoChar = allTlds.filter(t => t.tld.length === 3);    // .xx format
    const threeChar = allTlds.filter(t => t.tld.length === 4);  // .xxx format
    const longer = allTlds.filter(t => t.tld.length > 4);
    
    console.log(`   Single character TLDs: ${singleChar.length}`);
    console.log(`   Two character TLDs: ${twoChar.length}`);
    console.log(`   Three character TLDs: ${threeChar.length}`);
    console.log(`   Longer TLDs: ${longer.length}`);
    
    // Show some interesting TLDs
    console.log(`\n🎯 Notable TLDs:`);
    const notableTlds = ['.sol', '.skr', '.abc', '.dao', '.nft', '.degen', '.bonk'];
    
    notableTlds.forEach(tldName => {
      const found = allTlds.find(t => t.tld === tldName);
      if (found) {
        console.log(`   ✅ ${tldName} - Registered`);
      } else {
        console.log(`   ❌ ${tldName} - Not found`);
      }
    });
    
    // Export to file
    const fs = require('fs');
    const outputPath = `${Config.output.directory}/all-tlds.json`;
    
    const outputData = {
      timestamp: new Date().toISOString(),
      totalCount: allTlds.length,
      tlds: sortedTlds.map(t => ({
        tld: t.tld,
        parentAccount: t.parentAccount.toString()
      }))
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`\n💾 Full TLD list saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Error fetching TLDs:', error);
  }
}

// Run the script
if (require.main === module) {
  listAllTlds().catch(console.error);
}