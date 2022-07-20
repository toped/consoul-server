const { gql } = require('apollo-server-core')

const Room = gql`

  # TYPES 
  type GameRoom {
    id: ID
    host: String
    slug: String
    players: [GameUser]
    started: Boolean
    settings: RoomSettings
    game: Game
  }

  type GameUser {
    displayName: String
    email: String
    photoURL: String
    phoneNumber: String
    uid: ID
    isHost: Boolean
    anonymousUser: Boolean
  }

  type RoomSettings {
    rounds: Int
    maxPlayers: Int
    timeLimit: Int
  }

  # INPUTS
  input GameRoomInput {
    id: ID
    host: String
    slug: String
    started: Boolean
    players: [GameUserInput]
    settings: RoomSettingsInput
    game: GameInput
    triggerRound: Boolean
  }

  input RoomSettingsInput {
    rounds: Int
    maxPlayers: Int
    timeLimit: Int
  }

  input GameUserInput {
    displayName: String
    email: String
    photoURL: String
    phoneNumber: String
    uid: ID
    isHost: Boolean
    anonymousUser: Boolean
  }

  extend type Query {
    rooms(id: ID, host: String, playerUid: ID, slug: String): [GameRoom]
  }

  extend type Mutation {
    createRoom(room: GameRoomInput): GameRoom
    updateRoom(room: GameRoomInput): GameRoom
    deleteRoom(host: String): GameRoom
  }

  type Subscription {
    roomUpdated(slug: String!): GameRoom
    roomDeleted(slug: String!): GameRoom
  }
`

module.exports = Room