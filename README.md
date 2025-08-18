# Solana Seeker Scout

Advanced Solana domain discovery system that intelligently searches for .skr domain mentions across Twitter. Uses adaptive AI-powered search strategies to optimize data collection and maximize domain discovery.

## Features

- **🤖 Intelligent Query Generation**: Uses local AI algorithms to generate intelligent search queries
- **🧠 Adaptive Search Strategy**: Learns from results and optimizes search patterns
- **📊 Performance Analytics**: Tracks query performance and adapts strategies in real-time
- **🎯 Multi-Strategy Approach**: Diversifies, exploits successful patterns, or targets specific user types
- **⏰ Time-Aware Optimization**: Adjusts search timing based on historical performance
- **🌍 Multi-Language Support**: Handles Japanese, English, and other languages
- **📈 User Profiling**: Categorizes users (developers, traders, gamers, NFT collectors)
- **💾 Persistent Learning**: Saves and loads adaptive state across sessions
- **🔄 Rate Limiting**: Built-in rate limiting to respect API limits
- **📋 Data Export**: Exports data in JSON and CSV formats
- **🚀 Continuous Scouting**: Can run continuously with intelligent query adaptation

## Setup

1. Add your Twitter API key to `.env`:
```
TWITTER_API_KEY=your_rapidapi_key_here
```

2. Install dependencies:
```bash
npm install axios
```

## Usage

### Run Interactive Mode
```bash
npx ts-node src/twitter-harvester/harvesterAgent.ts
```

### Programmatic Usage
```typescript
import { HarvesterAgent } from './twitter-harvester';

const agent = new HarvesterAgent();

// Run single harvest
await agent.runSingleHarvest();

// Start continuous harvesting (every 30 minutes)
await agent.startContinuousHarvest(30);

// Scout specific domains
await agent.scoutSpecificDomains(['wallet.skr', 'nft.skr']);

// Get statistics
agent.getStatistics();

// Export for airdrop
agent.exportData();
```

## Output Files

- `output/scout-results/scouted_data.json` - Full scout data
- `output/scout-results/scouted_data.csv` - CSV export
- `output/scout-results/airdrop_list.json` - Formatted for token distribution
- `output/scout-results/progress.json` - Scout progress tracking
- `output/scout-results/adaptive_state.json` - AI learning state

## Data Structure

Each scouted record contains:
- `domain`: The .skr domain mentioned
- `username`: Twitter username who mentioned it
- `userId`: Twitter user ID
- `followers`: Number of followers
- `tweetId`: ID of the tweet containing mention
- `tweetText`: Full text of the tweet
- `timestamp`: When the tweet was created
- `scoutedAt`: When the data was scouted

## AI Search Strategies

The scout uses different strategies based on performance:

### 🎯 **Diversify Strategy**
- Used when few results found recently
- Explores new search angles and untapped niches
- Tries creative query combinations

### 🚀 **Exploit Strategy** 
- Used when getting good results
- Builds on successful query patterns
- Optimizes high-performing approaches

### 📈 **Trend-Surf Strategy**
- Used during peak hours (9-12, 18-22)
- Combines current Twitter trends with .skr searches
- Leverages viral content and hashtags

### ⏰ **Time-Optimize Strategy**
- Used during off-peak hours
- Targets queries effective at specific times
- Adapts to user activity patterns

### 👥 **User-Target Strategy**
- Used when enough data collected
- Targets underrepresented user segments
- Balances developer/trader/gamer/NFT collector discovery

## Priority Levels

Users are categorized by follower count:
- **High Priority**: > 10,000 followers  
- **Medium Priority**: 1,000 - 10,000 followers
- **Low Priority**: < 1,000 followers

## AI Learning

The system continuously learns and adapts:
- Tracks query performance over time
- Identifies successful patterns and timing
- Adapts to trends and user behavior changes
- Persists learning across sessions