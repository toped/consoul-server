require('dotenv').config()
const admin = require('firebase-admin')
const functions = require('firebase-functions')
const { ApolloServer, PubSub, gql } = require('apollo-server')
const port = process.env.PORT

var Twit = require('twit')

const typeDefs = require('./types')
const resolvers = require('./resolvers')
var serviceAccount = require('./service_key.json')

var twitterClient = new Twit({
	consumer_key: process.env.CONSUMER_KEY,
	consumer_secret: process.env.CONSUMER_SECRET,
	access_token: process.env.ACCESS_TOKEN,
	access_token_secret: process.env.ACCESS_TOKEN_SECRET,
	timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
	strictSSL: true // optional - requires SSL certificates to be valid.
})

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	databaseURL: 'https://memez-f18eb.firebaseio.com/',
	storageBucket: 'memez-f18eb.appspot.com'
})

const TimerModule = () => {
	let timers = {}
	const addTimer = (id, timer) => {
		timers[id] = timer
	}
	const getTimers = () => timers
	return {
		addTimer,
		getTimers
	}
}

const timerModule = TimerModule()

const context = async ({ req, res }) => {
	return {
		req,
		res,
		admin,
		twitterClient,
		timerModule,
	}
}

const apolloServer = new ApolloServer({
	typeDefs,
	resolvers,
	context,
	cors: true,
	subscriptions: {
		path: '/subscriptions',
		onConnect: (connectionParams, webSocket, context) => {
			console.log('Client connected')
			return context
		},
		onDisconnect: (webSocket, context) => {
			console.log('Client disconnected')
		},
	},
})

apolloServer.listen().then(({ url }) => {
	console.warn(`> 🚀  Apollo GraphQL Server ready on ${process.env.URL}${apolloServer.graphqlPath}`)
	console.warn(`> 🚀 Subscription endpoint ready at ws://localhost:${port}${apolloServer.subscriptionsPath}`)
	console.warn('Query at studio.apollographql.com/dev')
}).catch(err => {throw err})