const { gql } = require('apollo-server')

const Twitter = gql`
  scalar UserIdentity

  enum ResourceIdentifier {
    users
    statuses
    help
    search
  }

  enum UserIdentifier {
    id
    name
  }

  enum SearchResponse {
    mixed
    recent
    popular
  }

  type TwitterUser {
    created_at: String
    description: String
    id: ID, # GraphQLInt would return null
    screen_name: String
    name: String
    profile_image_url: String
    url: String
    tweets_count: Int
    protected: Boolean
    followers_count: Int
    tweets(limit: Int): [Tweet]
  }

  type Tweet {
    id: ID,
    created_at: String
    in_reply_to_status_id: Float
    in_reply_to_status_id_str: String
    inReplyToTweet: Tweet
    quotedTweet: Tweet
    text: String
    full_text: String
    retweet_count: Int
    user: TwitterUser
    retweets(limit: Int): [Retweet]
    entities: TweetEntity
  }

  type TweetEntity {
    urls: [UrlEntity]
    media: [MediaEntity]
  }

  type UrlEntity {
    url: String
    expanded_url: String
    display_url: String
  }

  type MediaEntity {
    url: String
    media_url: String
    media_url_https: String
  }

  type Retweet {
    id: ID
    created_at: String
    in_reply_to_tweet_id: String
    in_reply_to_user_id: Int,
    in_reply_to_screen_name: String
    retweeted_status: Tweet,
    user: TwitterUser
  }

  type RateLimitStatus {
    limit: ID
    remaining: String
    reset: String
  }

  extend type Query {
    getUser(identifier: UserIdentifier, identity: UserIdentity): TwitterUser
    getTweets(screenName: String, count: Int): [Tweet]
    getTweetsFromUsers(screenNames: [String], count: Int): [Tweet]
    getTweet(id: String): Tweet
    getRetweets(tweetId: String, count: Int): [Retweet]
    searchFor(q: String, count: Int, result_type: SearchResponse): [Tweet]
    getRateLimitStatus(identifier: ResourceIdentifier, endpoint: String): RateLimitStatus
  }
`

module.exports = Twitter