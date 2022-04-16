const lodash = require('lodash')
const Room = require('./Room')
const Game = require('./Game')

const resolvers = lodash.merge(
	Room,
	Game
)

module.exports = resolvers
