const { GraphQLScalarType, Kind } = require('graphql')
const { ApolloError } = require('apollo-server')
const moment = require('moment-timezone')

const getNested = (obj, ...args) => {
	return args.reduce((obj, level) => obj && obj[level], obj)
}

const sendRatLimitExceededEmail = (admin, twitterClient, identifier, endpoint) => {
	return new Promise((resolve, reject) => {
		twitterClient.get('application/rate_limit_status', { 
			resources: 'help,users,search,statuses,application' 
		}, (err, data, response) => {
			if (err) {
				reject(new ApolloError(err))
			}
			if (!data.resources) {
				reject(new ApolloError('data.resources returned null'))
			} else {
				const { limit, reset, remaining } = data.resources[identifier][endpoint]
				const resetTime = moment.unix(reset).tz('America/Chicago').format('MM/DD/YYYY hh:mma zz')

				console.warn(
					`
          **********************************************************
          Good news: email successfully queued
          **********************************************************
          `
				)

				admin.firestore().collection('mail').add({
					to: ['tope.daram@gmail.com', 'utterfungames@gmail.com'],
					message: {
						subject: 'Utter: Rate Limit Alert (Limit Exceeded)',
						html: 
            `
						<body style="display:flex;justify-content:center;
						background-color:rgb(247,247,247);padding:5rem 0; text-align:center">
							<div style="display:flex;flex-direction:column;color:#000;
							background-color:#FFF;font-family:'Droid Sans', 'Helvetica Neue', Arial, sans-serif;
							font-size:16px;align-items:center;margin:0 5rem;border-radius:24px;
							padding:2rem 5rem;max-width:480px">
                  <table style="width:100%">
                      <tr>
                          <h1>💬</h1>
                      </tr>
                      <tr>
                          <h1>Utter: Rate Limit Exceeded</h1>
                      </tr>
                      <tr>
                          <p>Quota for ${endpoint} has been exceeded.</p>
                          <br/>
                          <p>Quota limit for ${endpoint} is ${limit}. You have ${remaining} remaining.</p>
                      </tr>
                      <tr>
                      <p>Endpoint will reset at ${resetTime}.</p>
                      </tr>
                  </table>
                  <small style="color:rgba(0,0,0,0.5); margin-top:5rem;">© Utter.</small>
              </div>
          </body>
            `,
					},
				})
        
				resolve(data.resources[identifier][endpoint])
			}
		})
	})
}

const Twitter = {
	Query: {
		async getUser(parent, {identifier, identity }, { admin, twitterClient }) {
			return new Promise((resolve, reject) => {
				twitterClient.get('users/show', { [identifier]:identity }, (err, data, response) => {
					if (err) {
						reject(new ApolloError(err))
					}
					resolve(data)
				})
			})
		},
		async getTweets(parent, {screenName, count }, { admin, twitterClient }) {
			return new Promise((resolve, reject) => {
				twitterClient.get('statuses/user_timeline', { 
					screen_name: screenName, 
					count, 
					include_rts: false, 
					tweet_mode:'extended' }, (err, data, response) => {
					if (err) {
						reject(new ApolloError(err))
					}
					resolve(data)
				})
			})
		},
		async getTweetsFromUsers(parent, {screenNames, count }, { admin, twitterClient }) {
			const requests = []
			screenNames.forEach(screenName =>{
				requests.push( new Promise((resolve, reject) => {
					twitterClient.get('statuses/user_timeline', { 
						screen_name: screenName, 
						count, 
						include_rts: false, 
						tweet_mode:'extended' }, (err, data, response) => {
						if (err) {
							if (err.message === 'Sorry, that page does not exist.' 
							|| err.message === 'Not authorized.' 
							|| err.message === 'User has been suspended.'){
								console.warn(err)
								resolve(null)
							}

							if (err.message === 'Rate limit exceeded'){
								console.warn(err)
								sendRatLimitExceededEmail(admin, twitterClient, 'statuses', '/statuses/user_timeline')
									.catch(e => {
										console.warn(
											`
                    **********************************************************
                    Bad news: cannot send alert email
                    **********************************************************
                    `
										)
									})
							}

							reject(new ApolloError(err))
						} 
						resolve(data)
					})
				}))
			})
      
			const tweets = await Promise.all(requests).then((values) => {
				return values.filter(value => value)
			})

			return tweets.flat(1)
		},
		async getTweet(parent, { id }, { admin, twitterClient }) {
			return new Promise((resolve, reject) => {
				twitterClient.get('statuses/show', { id, tweet_mode:'extended' }, (err, data, response) => {
					if (err) {

						if (err.message === 'Rate limit exceeded'){
							console.warn(err)
							sendRatLimitExceededEmail(admin, twitterClient, 'statuses', '/statuses/show')
								.catch(e => {
									console.warn(
										`
                  **********************************************************
                  Bad news: cannot send alert email
                  **********************************************************
                  `
									)
								})
						}

						reject(new ApolloError(err))
					}
					resolve(data)
				})
			})
		},
		async getRetweets(parent, {tweetId, count }, { admin, twitterClient }) {
			return new Promise((resolve, reject) => {
				twitterClient.get('statuses/retweets', { 
					id: tweetId, 
					count, 
					tweet_mode:'extended' }, (err, data, response) => {
					if (err) {

						if (err.message === 'Rate limit exceeded'){
							console.warn(err)
							sendRatLimitExceededEmail(admin, twitterClient, 'statuses', '/statuses/retweets')
								.catch(e => {
									console.warn(
										`
                  **********************************************************
                  Bad news: cannot send alert email
                  **********************************************************
                  `
									)
								})
						}

						reject(new ApolloError(err))
					}
					resolve(data)
				})
			})
		},
		async searchFor(parent, args, { admin, twitterClient }) {
			return new Promise((resolve, reject) => {
				twitterClient.get('search/tweets', args, (err, data, response) => {
					if (err) {

						if (err.message === 'Rate limit exceeded'){
							console.warn(err)
							sendRatLimitExceededEmail(admin, twitterClient, 'statuses', '/statuses/tweets')
								.catch(e => {
									console.warn(
										`
                  **********************************************************
                  Bad news: cannot send alert email
                  **********************************************************
                  `
									)
								})
						}

						reject(new ApolloError(err))
					}
					resolve(data.statuses)
				})
			})
		},
		async getRateLimitStatus(parent, {identifier, endpoint }, { admin, twitterClient }) {
			return new Promise((resolve, reject) => {
				twitterClient.get('application/rate_limit_status', { 
					resources: 'help,users,search,statuses' }, (err, data, response) => {
					if (err) {

						if (err.message === 'Rate limit exceeded'){
							console.warn(err)
							sendRatLimitExceededEmail(
								admin, 
								twitterClient, 
								'application', 
								'/application/rate_limit_status')
								.catch(e => {
									console.warn(
										`
                  **********************************************************
                  Bad news: cannot send alert email
                  **********************************************************
                  `
									)
								})
						}

						reject(new ApolloError(err))
					} else {
						resolve(data.resources[identifier][`/${identifier}/${endpoint}`])
					}
				})
			})
		}
	},
	TwitterUser: {
		async tweets(parent, { limit }, { admin, twitterClient }) {
			return new Promise((resolve, reject) => {
				twitterClient.get('statuses/user_timeline', { 
					screen_name: parent.screen_name, 
					count: limit, 
					include_rts: false, 
					tweet_mode:'extended'}, (err, data, response) => {
					if (err) {

						if (err.message === 'Rate limit exceeded'){
							console.warn(err)
							sendRatLimitExceededEmail(admin, twitterClient, 'statuses', '/statuses/user_timeline')
								.catch(e => {
									console.warn(
										`
                  **********************************************************
                  Bad news: cannot send alert email
                  **********************************************************
                  `
									)
								})
						}

						reject(new ApolloError(err))
					}
					resolve(data)
				})
			})
		},
		tweets_count(parent, args, { admin, twitterClient }) {
			return parent.statuses_count
		}
	},
	Tweet: {
		async retweets(parent, { limit }, { admin, twitterClient }) {
			return new Promise((resolve, reject) => {
				// passing integer 'id' here doesn't work surprisingly, had to use 'id_str'
				twitterClient.get('statuses/retweets', { 
					id: parent.id_str, 
					count: limit, 
					tweet_mode:'extended' }, (err, data, response) => {
					if (err) {

						if (err.message === 'Rate limit exceeded'){
							console.warn(err)
							sendRatLimitExceededEmail(admin, twitterClient, 'statuses', '/statuses/retweets/:id')
								.catch(e => {
									console.warn(
										`
                  **********************************************************
                  Bad news: cannot send alert email
                  **********************************************************
                  `
									)
								})
						}

						reject(new ApolloError(err))
					}
					resolve(data)
				})
			})
		},
		async inReplyToTweet(parent, args, { admin, twitterClient }) {
			if(parent.in_reply_to_status_id_str) {
				return new Promise((resolve, reject) => {
					twitterClient.get('statuses/show', { 
						id: parent.in_reply_to_status_id_str, 
						tweet_mode:'extended' }, (err, data, response) => {
						if (err) {
							if (err.message === 'No data available for specified ID.' 
							|| err.message === 'Sorry, you are not authorized to see this status.' 
							|| err.message === 'User has been suspended.'){
								console.warn(err)
								resolve(null)
							}
							if (err.message === 'Rate limit exceeded'){
								console.warn(err)
								sendRatLimitExceededEmail(admin, twitterClient, 'statuses', '/statuses/show/:id')
									.catch(e => {
										console.warn(
											`
                    **********************************************************
                    Bad news: cannot send alert email
                    **********************************************************
                    `
										)
									})
								resolve(null)
							}

							reject(new ApolloError(err))
						}
						resolve(data)
					})
				})
			}
      
			return null
		},
		async quotedTweet(parent, args, { admin, twitterClient }) {
			const urls = getNested(parent, 'entities', 'urls')
			let quotedTweetId = null

			if(urls.length > 0 && urls[0].expanded_url) {
				let regex = /status\/(.*)/
				let result = urls[0].expanded_url.match(regex)
				quotedTweetId = result && result[1] ? result[1] : null
			}

			if(quotedTweetId) {
				return new Promise((resolve, reject) => {
					twitterClient.get('statuses/show', { 
						id: quotedTweetId, 
						tweet_mode:'extended' }, (err, data, response) => {
						if (err) {
							if (err.message === 'No data available for specified ID.' 
							|| err.message === 'Sorry, you are not authorized to see this status.' 
							|| err.message === 'User has been suspended.'){
								console.warn(err)
								resolve(null)
							}
							if (err.message === 'Rate limit exceeded'){
								console.warn(err)
								sendRatLimitExceededEmail(admin, twitterClient, 'statuses', '/statuses/show/:id')
									.catch(e => {
										console.warn(
											`
                    **********************************************************
                    Bad news: cannot send alert email
                    **********************************************************
                    `
										)
									})
								resolve(null)
							}

							reject(new ApolloError(err))
						}
						resolve(data)
					})
				})
			}
      
			return null
		}
	},
	Retweet: {
		in_reply_to_tweet_id(parent, args, { admin, twitterClient }){
			return parent.in_reply_to_status_id
		}
	},
	ResourceIdentifier: {
		users: 'users',
		statuses: 'statuses',
		help:'help',
		search: 'search'
	},
	UserIdentifier: {
		id: 'user_id',
		name: 'screen_name'
	},
	SearchResponse: {
		mixed: 'mixed',
		recent: 'recent',
		popular: 'popular'
	},
	UserIdentity: new GraphQLScalarType({
		name: 'UserIdentity',
		description  : 'Parse user provided identity',
		serialize(value) {
			return value
		},
		parseValue(value) {
			return value
		},
		parseLiteral(ast) {
			if (ast.kind !== Kind.STRING && ast.kind !== Kind.INT) {
				throw new ApolloError('Query error: Can only parse Integer and String but got a: ' + ast.kind, [ast])
			}
			return ast.value
		}
	})
}

module.exports = Twitter