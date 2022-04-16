require('dotenv').config()
const admin = require('firebase-admin')
const functions = require('firebase-functions')
const { ApolloServer, PubSub, gql } = require('apollo-server')
const { DefaultAzureCredential } = require("@azure/identity")
const { SecretClient }  = require("@azure/keyvault-secrets")

const port = process.env.PORT
const keyVaultName = process.env.KEY_VAULT_NAME
const keyVaultUri = `https://${keyVaultName}.vault.azure.net`
const credential = new DefaultAzureCredential()
const secretClient = new SecretClient(keyVaultUri, credential)

var Twit = require('twit')

const typeDefs = require('./types')
const resolvers = require('./resolvers');

(async function() {
	var serviceAccountSecret = await secretClient.getSecret('firebase-service-key')
	var serviceAccount = JSON.parse(serviceAccountSecret.value)

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
		const removeTimer = (id) => {
			delete timers[id]
		}
		const getTimers = () => timers
		
		return {
			addTimer,
			getTimers,
			removeTimer
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

})()


