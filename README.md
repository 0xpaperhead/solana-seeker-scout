# Solana Seeker Scout

Advanced .skr domain mention discovery system that finds Twitter mentions of registered Solana domains and analyzes them with AI-powered sentiment analysis and user analytics.

## Features

- **🔗 Blockchain Integration**: Fetches all registered .skr domains directly from Solana blockchain
- **🐦 Twitter Search**: Searches Twitter for mentions of registered domains
- **🧠 AI Sentiment Analysis**: Uses OpenAI to analyze tweet sentiment and domain ownership claims
- **👤 User Analytics**: Collects follower counts, verification status, and user details
- **📊 Rich Analytics**: Generates comprehensive statistics and insights per domain
- **💾 Multiple Export Formats**: Saves results in JSON and CSV formats
- **🔄 Smart Caching**: Avoids redundant blockchain calls with configurable cache timing
- **⏰ Continuous Monitoring**: Run one-time or continuous scouting with customizable intervals

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

Edit `.env` with your API keys:
```bash
# Twitter API Configuration (Required)
RAPIDAPI_KEY=your_rapidapi_key_here

# OpenAI Configuration (Required)
OPENAI_API_KEY=your_openai_api_key_here

# Solana Configuration (Optional)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Cache Configuration (Optional)
DOMAIN_CACHE_MINUTES=5
```

### 3. Get API Keys
- **RapidAPI**: Get your Twitter API key from [RapidAPI Twitter API](https://rapidapi.com/davethebeast/api/twitter241)
- **OpenAI**: Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)

### 4. Build and Run
```bash
npm run build
npm run scout
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

### Interactive Menu
When you run `npm run scout`, you'll get an interactive menu:

1. **Scout registered domains** - Complete flow for all registered .skr domains
2. **Scout specific domains** - Target specific domains you choose
3. **Start continuous scouting** - Run automated scouting every X minutes
4. **Dump registered domains** - Fetch latest domains from Solana blockchain
5. **Show statistics** - Display results from previous scout runs
6. **Stop scouting** - Stop continuous mode
7. **Exit** - Quit the application

## Scout Flow

The system follows a comprehensive 5-step process:

1. **🔗 Get Domains** → Fetches registered .skr domains from Solana blockchain
2. **🔍 Search Mentions** → Searches Twitter for `"domain.skr"` mentions
3. **🧠 Analyze Sentiment** → OpenAI analyzes each tweet for sentiment and ownership
4. **👤 Get User Details** → Fetches follower counts and verification status
5. **📊 Generate Analytics** → Compiles comprehensive domain and user statistics

## Output Files

Results are saved in `output/scout-results/` directory:

- **`scout-results-{timestamp}.json`** - Complete scout results with timestamps
- **`latest-scout-results.json`** - Most recent results (always current)
- **`scout-mentions-{timestamp}.csv`** - Spreadsheet-friendly format
- **`solana_domains.json`** - All registered domains from blockchain

## Data Structure

### Scout Results
```json
{
  "totalDomains": 150,
  "domainsWithMentions": 23,
  "totalMentions": 45,
  "totalReach": 125000,
  "scoutedAt": "2025-01-15T10:30:00Z",
  "domains": [...],
  "mentions": [...]
}
```

### Individual Mentions
Each mention includes:
- **Domain**: The .skr domain mentioned
- **User Details**: Username, followers, verification status
- **Tweet Data**: Text, ID, timestamp
- **AI Analysis**: Sentiment (positive/neutral/negative), ownership detection
- **Reasoning**: OpenAI's explanation for sentiment/ownership decision

### Domain Analytics
Per-domain statistics include:
- **Reach Metrics**: Total followers, average influence
- **Sentiment Breakdown**: Distribution of positive/neutral/negative mentions
- **Ownership Insights**: Confirmed owners vs casual mentions
- **Top Influencers**: Highest-follower users mentioning the domain

## Smart Caching

The system uses intelligent caching to optimize performance:
- **Domain Cache**: Reuses blockchain data for 5 minutes (configurable)
- **Rate Limiting**: Built-in delays to respect API quotas
- **Efficient Requests**: Only fetches user details when usernames are available

## AI-Powered Analysis

Each tweet is analyzed by OpenAI to determine:
- **Sentiment**: Positive, neutral, or negative (with 1-10 score)
- **Ownership**: Does the user claim to own the domain? (yes/no/unknown)
- **Reasoning**: Detailed explanation of the AI's decision

This enables identification of actual domain owners vs casual mentions.

## Use Cases

- **Domain Analytics**: Understand which .skr domains are gaining traction
- **Owner Discovery**: Find users who claim ownership of specific domains
- **Market Research**: Analyze sentiment around domain mentions
- **Influence Tracking**: Identify high-follower users discussing domains
- **Trend Analysis**: Monitor domain mention patterns over time

## Requirements

- **Node.js** 18+
- **TypeScript** 5+
- **RapidAPI Account** (for Twitter access)
- **OpenAI Account** (for sentiment analysis)
- **Internet Connection** (for Solana RPC and APIs)