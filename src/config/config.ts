import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const Config = {
  rapidapi: {
    key: process.env.RAPIDAPI_KEY || '',
  },

  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },

  output: {
    directory: './output/scout-results',
  },

  scout: {
    domainCacheMinutes: 5,
  },
};

// Validation
if (!Config.rapidapi.key) {
  throw new Error(
    'Twitter API key not found. Please set RAPIDAPI_KEY in .env file.\n' +
    'Get your API key from: https://rapidapi.com/davethebeast/api/twitter241'
  );
}

export default Config;