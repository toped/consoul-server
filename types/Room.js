const { gql } = require('apollo-server')

const Room = gql`

  # TYPES 
  type GameRoom {
    id: ID
    host: String
    slug: String
    settings: GameSettings
    #readonly
  }

  type GameUser {
    displayName: String
    status: String
    uid: String
  }

  type GameSettings {
    rounds: Int
    maxPlayers: Int
    timeLimit: Int
  }

  # INPUTS
  input GameRoomInput {
    id: ID
    host: String
    settings: GameSettingsInput
  }

  input GameSettingsInput {
    rounds: Int
    maxPlayers: Int
    timeLimit: Int
  }

  extend type Query {
    rooms(id: ID, host: String, slug: String): [GameRoom]
  }

  extend type Mutation {
    createRoom(room: GameRoomInput): GameRoom
    updateRoom(room: GameRoomInput): GameRoom
    deleteRoom(host: String): String
  }

  type Subscription {
    roomUpdated(slug: String!): GameRoom
  }
`

module.exports = Room