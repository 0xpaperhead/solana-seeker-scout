import { TwitterClient } from '../clients/twitter-client';
import Config from '../config/config';

async function testTwitterClient() {
  console.log('🧪 Testing TwitterClient integration...');
  
  try {
    const client = new TwitterClient(Config.rapidapi.key);
    
    // Test 1: Search for tweets
    console.log('\n📍 Test 1: Searching for tweets...');
    const searchResult = await client.searchTweets('solana', 5);
    console.log(`Found ${searchResult.tweets.length} tweets`);
    
    if (searchResult.tweets.length > 0) {
      const firstTweet = searchResult.tweets[0];
      console.log('\n📊 First tweet structure:');
      console.log('- ID:', firstTweet.id);
      console.log('- Text:', firstTweet.text.substring(0, 100) + '...');
      console.log('- Author ID:', firstTweet.author_id);
      console.log('- Created At:', firstTweet.created_at);
      console.log('- Username:', firstTweet.username || 'undefined');
      console.log('- Name:', firstTweet.name || 'undefined');
      
      // Test 2: Get user details
      if (firstTweet.username) {
        console.log('\n📍 Test 2: Getting user details...');
        try {
          const userDetails = await client.getUserDetails(firstTweet.username);
          console.log('✅ User details retrieved:');
          console.log('- ID:', userDetails?.id);
          console.log('- Username:', userDetails?.username);
          console.log('- Name:', userDetails?.name);
          console.log('- Followers:', userDetails?.followers_count);
          console.log('- Following:', userDetails?.following_count);
          console.log('- Verified:', userDetails?.verified);
        } catch (userError) {
          console.error('❌ Failed to get user details:', userError);
        }
      } else {
        console.log('\n📍 Test 2: No username available, testing with author_id...');
        try {
          const userDetails = await client.getUserDetails(firstTweet.author_id);
          console.log('✅ User details retrieved by ID:');
          console.log('- ID:', userDetails?.id);
          console.log('- Username:', userDetails?.username);
          console.log('- Name:', userDetails?.name);
          console.log('- Followers:', userDetails?.followers_count);
          console.log('- Following:', userDetails?.following_count);
          console.log('- Verified:', userDetails?.verified);
        } catch (userError) {
          console.error('❌ Failed to get user details by ID:', userError);
        }
      }
    }
    
    console.log('\n✅ Twitter Client test completed');
    
  } catch (error) {
    console.error('❌ Twitter Client test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testTwitterClient().catch(console.error);
}