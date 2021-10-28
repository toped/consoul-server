const { gql } = require('apollo-server')
const Twitter = require('./Twitter')
const Room = require('./Room')
const Game = require('./Game')

const types = gql`
  type Query {
    _empty: String
  }
  type Mutation {
    _empty: String
  }
  type Subscriptions {
    _empty: String
  }
  ${Twitter}
  ${Room}
  ${Game}
`

module.exports = types
