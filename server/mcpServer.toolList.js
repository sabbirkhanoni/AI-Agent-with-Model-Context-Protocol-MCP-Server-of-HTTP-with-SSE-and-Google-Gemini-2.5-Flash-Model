import {config} from "dotenv";
import {TwitterApi} from "twitter-api-v2";
config();

const twitterClient = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_KEY_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});


export async function createTweetPost(postContent){
    const newPost = await twitterClient.v2.tweet(postContent);

    return {
        content: [
            {
                type: "text",
                text: `Tweet posted successfully with ID: ${newPost.data.id}`
            }
        ]
    };

}




