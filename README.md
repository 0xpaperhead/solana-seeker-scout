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

## Getting Started

### 1. Clone and Install
```bash
git clone <repository-url>
cd twitter-harvester
npm install
```

### 2. Environment Configuration
Copy the example environment file and configure your API keys:
```bash
cp .env.example .env
```

Edit `.env` with your RapidAPI key:
```bash
# RapidAPI key for Twitter access
RAPIDAPI_KEY=your_rapidapi_key_here

# Solana Configuration (optional, defaults to mainnet-beta)  
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

### 3. Build the Project
```bash
npm run build
```

## Usage

### Available Commands
```bash
# Run the scout in development mode
npm run dev

# Run the scout (production)
npm run scout

# Build the project
npm run build

# Start built application
npm start

# Type checking
npm run typecheck

# Lint code
npm run lint

# Clean build artifacts
npm run clean
```

### Running the Scout
```bash
# Start scouting for .skr domains
npm run scout
```

The scout will:
1. Initialize with adaptive search strategies
2. Begin collecting Twitter data for .skr domain mentions  
3. Save results to `output/scout-results/` directory
4. Continuously adapt search patterns based on performance

## API Setup

Get your RapidAPI key from [RapidAPI Twitter API](https://rapidapi.com/davethebeast/api/twitter241) and add it to your `.env` file. The system includes built-in rate limiting to respect API quotas.

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