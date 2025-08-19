import { SolanaDomainDumper } from '../integrations/solana-domain-dumper';
import Config from '../config/config';

async function testDomainDumper() {
  console.log('🧪 Testing SolanaDomainDumper...');
  
  try {
    const dumper = new SolanaDomainDumper(Config.solana.rpcUrl);
    
    console.log('📍 Test: Fetching .skr domains from Solana blockchain...');
    console.log(`Using RPC URL: ${Config.solana.rpcUrl}`);
    
    const domains = await dumper.fetchAllSkrDomains();
    
    console.log(`✅ Successfully fetched ${domains.length} .skr domains`);
    
    if (domains.length > 0) {
      console.log('\n📊 Sample domains:');
      const sampleCount = Math.min(5, domains.length);
      
      for (let i = 0; i < sampleCount; i++) {
        const domain = domains[i];
        console.log(`${i + 1}. ${domain.domain}`);
        console.log(`   Owner: ${domain.owner.substring(0, 20)}...`);
        console.log(`   Address: ${domain.address.substring(0, 20)}...`);
        if (domain.expiresAt) {
          const expiryDate = new Date(domain.expiresAt * 1000);
          console.log(`   Expires: ${expiryDate.toISOString()}`);
        }
      }
      
      console.log(`\n📈 Domain Statistics:`);
      dumper.getStats(domains);
      
      console.log('\n💾 Testing save functionality...');
      await dumper.saveDomains(domains);
      
    } else {
      console.log('⚠️  No domains found. This might indicate an issue with the TLD setup or RPC connection.');
    }
    
    console.log('\n✅ Domain dumper test completed successfully');
    
  } catch (error) {
    console.error('❌ Domain dumper test failed:', error);
    console.error('\nPossible issues:');
    console.error('- RPC URL connection problems');
    console.error('- .skr TLD not found in AllDomain registry');
    console.error('- Solana network issues');
    console.error('- @onsol/tldparser API changes');
  }
}

// Run the test
if (require.main === module) {
  testDomainDumper().catch(console.error);
}