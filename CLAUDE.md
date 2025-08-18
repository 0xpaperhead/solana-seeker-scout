# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is Solana Seeker Scout - an advanced TypeScript-based system that intelligently discovers .skr domain mentions across Twitter. The system uses adaptive AI-powered search strategies to optimize domain discovery and data collection.

## Key Architecture Components

### Core Modules
- **src/agents/harvester-agent.ts**: Main orchestration agent (ScoutAgent class) that coordinates scouting operations
- **src/agents/data-scout.ts**: DataScout class handling the actual data collection logic
- **src/clients/twitter-client.ts**: TwitterClient for API interactions
- **src/strategies/adaptive-search-strategy.ts**: AI-powered adaptive search strategy implementation
- **src/strategies/local-intelligent-generator.ts**: Local AI algorithm for generating search queries
- **src/scanners/domain-scanner.ts**: SkrDomainScanner for scanning domain mentions
- **src/scanners/domain-specific-search.ts**: Domain-specific search implementation
- **src/integrations/solana-domain-dumper.ts**: Solana blockchain domain data dumper

### Data Flow
1. ScoutAgent orchestrates scouting cycles
2. DataScout uses AdaptiveSearchStrategy to generate optimized queries
3. TwitterClient fetches data from Twitter API
4. Results are processed and stored in output/scout-results/ directory
5. System adapts search patterns based on performance metrics

## Development Commands

### Running the Application
```bash
# Run the main scout agent
npm run scout

# Development mode
npm run dev

# Build and run production
npm run build
npm start
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

All scouted data is stored in `output/scout-results/` directory:
- `scouted_data.json`: Full scout data
- `scouted_data.csv`: CSV export format
- `airdrop_list.json`: Formatted for token distribution
- `progress.json`: Scout progress tracking
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