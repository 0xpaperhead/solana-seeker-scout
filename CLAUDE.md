# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript-based Twitter data collection system that searches for mentions of .skr domains (Solana mobile TLD). The system uses adaptive AI-powered search strategies to optimize data collection.

## Key Architecture Components

### Core Modules
- **harvesterAgent.ts**: Main orchestration agent (ScoutAgent class) that coordinates harvesting operations
- **dataHarvester.ts**: DataScout class handling the actual data collection logic
- **twitterClient.ts**: TwitterClient for API interactions
- **adaptiveSearchStrategy.ts**: AI-powered adaptive search strategy implementation
- **localIntelligentGenerator.ts**: Local AI algorithm for generating search queries
- **domainScanner.ts**: SkrDomainScanner for scanning domain mentions
- **domainSpecificSearch.ts**: Domain-specific search implementation
- **solanaDomainDumper.ts**: Solana blockchain domain data dumper

### Data Flow
1. ScoutAgent orchestrates harvesting cycles
2. DataScout uses AdaptiveSearchStrategy to generate optimized queries
3. TwitterClient fetches data from Twitter API
4. Results are processed and stored in scout-results/ directory
5. System adapts search patterns based on performance metrics

## Development Commands

### Running the Application
```bash
# Run the main harvester agent
npx ts-node harvesterAgent.ts

# Run from project root
npx ts-node src/twitter-harvester/harvesterAgent.ts
```

### Dependencies
```bash
# Install required dependencies
npm install axios dotenv
npm install --save-dev @types/node typescript ts-node
```

## Environment Configuration

Required environment variables in `.env`:
- `TWITTER_API_KEY` or `RAPIDAPI_KEY`: Twitter API key for data collection
- `SOLANA_RPC_URL`: Solana RPC endpoint (defaults to mainnet-beta)

## Data Storage

All harvested data is stored in `scout-results/` directory:
- `harvested_data.json`: Full harvest data
- `harvested_data.csv`: CSV export format
- `airdrop_list.json`: Formatted for token distribution
- `progress.json`: Harvest progress tracking
- `adaptive_state.json`: AI learning state persistence

## Search Strategy System

The adaptive search system switches between strategies based on performance:
- **Diversify**: Explores new search angles when results are low
- **Exploit**: Optimizes successful query patterns
- **Trend-Surf**: Leverages Twitter trends during peak hours
- **Time-Optimize**: Adapts to off-peak hour patterns
- **User-Target**: Targets specific user segments

## API Rate Limiting

The system includes built-in rate limiting to respect Twitter API limits. Rate limiting is handled automatically by the TwitterClient module.

## TypeScript Configuration

Project uses TypeScript with ES modules. When working with imports:
- Use ES6 import/export syntax
- File extensions should be .ts
- Use npx ts-node for execution