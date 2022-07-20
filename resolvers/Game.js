const { ApolloError } = require('apollo-server-errors')
const gameHelpers = require('../utils/functions/gameHelpers')
const messages = require('../utils/functions/messages')

const Game = {
	Query: {
		async games(parent, _, { admin }) {
			return admin
				.database()
				.ref('games')
				.once('value')
				.then(snap => snap.val())
				.then(val => val && Object.keys(val).map(key => val[key]) || [])
				.catch((err) => {
					return new ApolloError(err)
				})
		},
		async game(parent, { title }, { admin }) {
			return gameHelpers.fetchGame(admin, { identifier: 'title', value: title })
		}
	},
	Mutation: {
		async createGame(parent, { game }, { admin }) {
			// Check if game with title exists
			if (await gameHelpers.gameExists(admin, game.title))
				return new ApolloError(messages.errors.GAME_EXISTS)

			// Get a key for a new room.
			const newGameKey = admin
				.database()
				.ref()
				.child('/games')
				.push()
				.key
			// Write the new data.
			let updates = {}
			updates[`/games/${game.title}`] = {
				id: newGameKey,
				...game
			}

			return admin
				.database()
				.ref()
				.update(updates)
				.then(() => gameHelpers.fetchGame(admin, { identifier: 'title', value: game.title }))
		},
		async deleteGame(parent, { title }, { admin }) {
			const game = await gameHelpers.fetchGame(admin, { identifier: 'title', value: title })

			if (!game)
				return new ApolloError(messages.errors.NO_GAME_FOUND)

			return admin
				.database()
				.ref(`/games/${title}`)
				.remove()
				.then(() => 'success')
		}
	}
}

module.exports = Game