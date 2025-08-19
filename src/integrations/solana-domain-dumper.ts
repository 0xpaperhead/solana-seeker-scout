import {
    ANS_PROGRAM_ID,
    findNameHouse,
    findNftRecord,
    getAllTld,
    getHashedName,
    getNameAccountKeyWithBump,
    NameRecordHeader,
} from "@onsol/tldparser";
import {
    Connection,
    GetProgramAccountsResponse,
    PublicKey,
} from "@solana/web3.js";
import { setTimeout } from "timers/promises";
import * as fs from 'fs';
import * as path from 'path';
import Config from "../config/config";

interface SkrDomain {
  domain: string;
  owner: string;
  address: string;
  registrationTimestamp?: number;
  expiresAt?: number;
  createdAt?: number;
}

interface DomainRegistry {
  domains: SkrDomain[];
  totalCount: number;
  lastUpdated: string;
  tld: string;
}

async function findAllDomainsForTld(
    connection: Connection,
    parentAccount: PublicKey,
): Promise<{ pubkey: PublicKey; nameRecordHeader: NameRecordHeader }[]> {
    const filters: any = [
        {
            memcmp: {
                offset: 8,
                bytes: parentAccount.toBase58(),
            },
        },
    ];

    const accounts: GetProgramAccountsResponse =
        await connection.getProgramAccounts(ANS_PROGRAM_ID, {
            filters: filters,
        });
    return accounts.map((a) => {
        return {
            pubkey: a.pubkey,
            nameRecordHeader: NameRecordHeader.fromAccountInfo(a.account),
        };
    });
}

async function performReverseLookupBatched(
    connection: Connection,
    nameAccounts: PublicKey[],
    tldHouse: PublicKey,
): Promise<(string | undefined)[]> {
    let reverseLookupDomains: (string | undefined)[] = [];

    while (nameAccounts.length > 0) {
        const currentBatch = nameAccounts.splice(0, 100);

        const promises = currentBatch.map(async (nameAccount) => {
            const reverseLookupHashedName = await getHashedName(
                nameAccount.toBase58(),
            );
            const [reverseLookUpAccount] = getNameAccountKeyWithBump(
                reverseLookupHashedName,
                tldHouse,
                undefined,
            );
            return reverseLookUpAccount;
        });

        const reverseLookUpAccounts: PublicKey[] = await Promise.all(promises);
        const reverseLookupAccountInfos =
            await connection.getMultipleAccountsInfo(reverseLookUpAccounts);

        const batchDomains = reverseLookupAccountInfos.map(
            (reverseLookupAccountInfo) => {
                const domain = reverseLookupAccountInfo?.data
                    .subarray(200, reverseLookupAccountInfo?.data.length)
                    .toString();
                return domain;
            },
        );

        reverseLookupDomains = reverseLookupDomains.concat(batchDomains);
    }

    return reverseLookupDomains;
}

export class SolanaDomainDumper {
  private connection: Connection;
  private outputDir: string;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.outputDir = Config.output.directory;
    
    this.ensureOutputDirectory();
  }

  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async fetchAllSkrDomains(): Promise<SkrDomain[]> {
    console.log('🔍 Fetching all .skr domains from Solana AllDomain TLD House Program...');
    
    return await this.getAllRegisteredDomainsForTld(".skr", false);
  }

  private async getAllRegisteredDomainsForTld(
      tld: string,
      onlyDomains: boolean = false,
  ): Promise<SkrDomain[]> {
      // Remove leading dot if present for consistency
      const normalizedTld = tld.startsWith('.') ? tld : `.${tld}`;
      
      console.log(`Looking up all registered domains for TLD: ${normalizedTld}`);
      
      // get all TLDs
      const allTlds = await getAllTld(this.connection);
      
      // Find the specific TLD
      const targetTld = allTlds.find(t => t.tld === normalizedTld);
      
      if (!targetTld) {
          throw new Error(`TLD ${normalizedTld} not found. Available TLDs: ${allTlds.map(t => t.tld).join(', ')}`);
      }
      
      console.log(`Found TLD: ${targetTld.tld} with parent account: ${targetTld.parentAccount.toString()}`);
      
      // get the parent name record for the TLD
      const parentNameRecord = await NameRecordHeader.fromAccountAddress(
          this.connection,
          targetTld.parentAccount,
      );
      
      if (!parentNameRecord) {
          throw new Error(`Parent name record not found for TLD ${normalizedTld}`);
      }
      
      if (!parentNameRecord.owner) {
          throw new Error(`Parent name record has no owner for TLD ${normalizedTld}`);
      }

      console.log(`Getting all name accounts for TLD ${normalizedTld}...`);
      
      // get all name accounts in the specific TLD
      const allNameAccountsForTld = await findAllDomainsForTld(
          this.connection,
          targetTld.parentAccount,
      );
      
      console.log(`Found ${allNameAccountsForTld.length} name accounts for TLD ${normalizedTld}`);
      
      if (allNameAccountsForTld.length === 0) {
          console.log(`No domains found for TLD ${normalizedTld}`);
          return [];
      }
      
      await setTimeout(50);
      
      const [nameHouseAccount] = findNameHouse(parentNameRecord.owner);

      const nameAccountPubkeys = allNameAccountsForTld.map((a) => a.pubkey);

      console.log(`Performing reverse lookup for domain names...`);
      
      const domainsReverse = await performReverseLookupBatched(
          this.connection,
          nameAccountPubkeys,
          parentNameRecord.owner,
      );

      const domains: SkrDomain[] = [];
      let index = 0;
      
      console.log(`Processing domain ownership information...`);
      
      for (const domain of domainsReverse) {
          const [nftRecord] = findNftRecord(
              allNameAccountsForTld[index].pubkey,
              nameHouseAccount,
          );
          let finalOwner =
              allNameAccountsForTld[index].nameRecordHeader.owner?.toString() || 'unknown';
          if (finalOwner == nftRecord.toString() && !onlyDomains) {
              try {
                  // Try to get the NFT record data and resolve to actual owner
                  const nftRecordAccountInfo = await this.connection.getAccountInfo(nftRecord);
                  if (nftRecordAccountInfo?.data) {
                      // For now, skip NFT ownership resolution due to API changes
                      // Keep the domain record account as owner
                      console.log(`Domain ${domain} is NFT-wrapped, keeping record owner`);
                  }
                  await setTimeout(50);
              } catch (nftError) {
                  console.warn(`Could not resolve NFT owner for domain ${domain}:`, nftError);
              }
          }
          domains.push({
              domain: `${domain}${targetTld.tld}`,
              owner: finalOwner,
              address: allNameAccountsForTld[index].pubkey.toString(),
              expiresAt: allNameAccountsForTld[index].nameRecordHeader.expiresAt ? new Date(allNameAccountsForTld[index].nameRecordHeader.expiresAt!).getTime() / 1000 : undefined,
              createdAt: undefined, // createdAt not available in NameRecordHeader
          });
          index += 1;
      }
      
      console.log(`✅ Successfully processed ${domains.length} domains for TLD ${normalizedTld}`);
      return domains;
  }

  async saveDomains(domains: SkrDomain[]): Promise<void> {
    const registry: DomainRegistry = {
      domains,
      totalCount: domains.length,
      lastUpdated: new Date().toISOString(),
      tld: '.skr'
    };

    const filePath = path.join(this.outputDir, 'solana_domains.json');
    fs.writeFileSync(filePath, JSON.stringify(registry, null, 2));
    console.log(`💾 Saved ${domains.length} .skr domains to ${filePath}`);

    // Also save a simplified CSV format
    const csvPath = path.join(this.outputDir, 'solana_domains.csv');
    const csvHeader = 'Domain,Owner,Address,Created At,Expires At\n';
    const csvData = domains.map(d => 
      `${d.domain},${d.owner},${d.address},${d.createdAt || ''},${d.expiresAt || ''}`
    ).join('\n');
    
    fs.writeFileSync(csvPath, csvHeader + csvData);
    console.log(`📊 Saved CSV export to ${csvPath}`);
  }

  async dumpAllDomains(): Promise<SkrDomain[]> {
    console.log('🚀 Starting .skr domain dump from Solana blockchain...');
    
    try {
      const domains = await this.fetchAllSkrDomains();
      await this.saveDomains(domains);
      
      console.log(`\n🎉 Domain dump complete!`);
      console.log(`   📈 Total domains: ${domains.length}`);
      console.log(`   💾 Files saved in: ${this.outputDir}`);
      
      return domains;
    } catch (error) {
      console.error('❌ Error during domain dump:', error);
      throw error;
    }
  }

  getStats(domains: SkrDomain[]): void {
    console.log('\n📊 === Domain Statistics ===');
    console.log(`Total .skr domains: ${domains.length}`);
    
    const uniqueOwners = new Set(domains.map(d => d.owner)).size;
    console.log(`Unique owners: ${uniqueOwners}`);
    
    const withExpiration = domains.filter(d => d.expiresAt).length;
    console.log(`Domains with expiration: ${withExpiration}`);
    
    const recentDomains = domains.filter(d => 
      d.createdAt && (Date.now() / 1000 - d.createdAt) < 86400 * 30 // Last 30 days
    ).length;
    console.log(`Registered in last 30 days: ${recentDomains}`);
  }
}