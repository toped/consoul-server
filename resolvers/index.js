const lodash = require('lodash')
const Twitter = require('./Twitter')
const Room = require('./Room')
const Game = require('./Game')

const resolvers = lodash.merge(
	Twitter,
	Room,
	Game
)

module.exports = resolvers
