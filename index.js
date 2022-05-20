require('dotenv').config()
const { ApolloServer } = require('apollo-server-express')
const { createServer } = require('http')
const express = require('express')
const { ApolloServerPluginDrainHttpServer } = require("apollo-server-core")
const { makeExecutableSchema } = require('@graphql-tools/schema')
const { WebSocketServer } =  require('ws')
const { useServer } = require('graphql-ws/lib/use/ws')
const typeDefs = require('./types')
const resolvers = require('./resolvers');
const { DefaultAzureCredential } = require("@azure/identity")
const { SecretClient }  = require("@azure/keyvault-secrets")
const admin = require('firebase-admin')
const functions = require('firebase-functions')

const keyVaultName = process.env.KEY_VAULT_NAME || 'consoullabs-dev-kv'
const keyVaultUri = `https://${keyVaultName}.vault.azure.net`
const credential = new DefaultAzureCredential()
const secretClient = new SecretClient(keyVaultUri, credential);

(async function() {
	var serviceAccountSecret = await secretClient.getSecret('firebase-service-key')
	var serviceAccount = JSON.parse(serviceAccountSecret.value)

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
	
	const context = async ({ req, res, connection }) => {
		if (connection) { // Operation is a Subscription
			// Obtain connectionParams-provided token from connection.context
			const token = connection.context.authorization || ""
			console.log(token)
		} 
		
		return {
			req,
			res,
			admin,
			timerModule,
		}
	}

	// Create the schema, which will be used separately by ApolloServer and
	// the WebSocket server.
	const schema = makeExecutableSchema({ typeDefs, resolvers })

	// Create an Express app and HTTP server; we will attach both the WebSocket
	// server and the ApolloServer to this HTTP server.
	const app = express();
	const httpServer = createServer(app)

	// Create our WebSocket server using the HTTP server we just set up.
	const wsServer = new WebSocketServer({
		server: httpServer,
		path: '/graphql',
	});

	// Save the returned server's info so we can shutdown this server later
	const serverCleanup = useServer({ 
		schema,
		// As before, ctx is the graphql-ws Context where connectionParams live.
		onConnect: async (ctx) => {
			console.log('Client connected')
		},
		onDisconnect(ctx, code, reason) {
			console.log('Disconnected!')
			console.log('code: ', code)
			console.log('reason: ', reason)
		},
		onError(ctx, message, error) {
			console.log('Error occurred!')
			console.log('message: ', message)
			console.log('error: ', error)
		},
		onClose(ctx, code, error) {
			console.log('Error occurred!')
			console.log('code: ', code)
			console.log('error: ', error)
		}
	}, wsServer)


	// Set up ApolloServer.
	const server = new ApolloServer({
		schema,
		context,
		csrfPrevention: true,
		plugins: [
		// Proper shutdown for the HTTP server.
		ApolloServerPluginDrainHttpServer({ httpServer }),
	
		// Proper shutdown for the WebSocket server.
		{
			async serverWillStart() {
			return {
				async drainServer() {
				await serverCleanup.dispose();
				},
			};
			},
		},
		],
	})
	await server.start()

	server.applyMiddleware({ app })

	const PORT = 8080
	
	// Now that our HTTP server is fully set up, we can listen to it.
	httpServer.listen(PORT, (err) => {
		if (err) throw err
		console.warn(`> 🚀 Apollo GraphQL Server is now running on http://localhost:${PORT}${server.graphqlPath}`)
		console.warn('Query at studio.apollographql.com/dev')
	})
})()


