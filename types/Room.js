const { gql } = require('apollo-server-core')

const Room = gql`

  # TYPES 
  type GameRoom {
    id: ID
    host: String
    slug: String
    players: [GameUser]
    started: Boolean
    settings: GameSettings
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

  type GameSettings {
    rounds: Int
    maxPlayers: Int
    timeLimit: Int
  }

  type Game {
    rounds: Int
    timeLimit: Int
    currentRound: Int
    currentTurn: Int
    countDownTime: Int
    roundTime: Int
    roundTimeElapsed: Boolean
    cards: [GameCard]
    gameOver: Boolean
  }

  type GameCard {
    user: ID
    text: String
    revealed: Boolean
    highlighted: Boolean
    selected: Boolean
  }

  # INPUTS
  input GameRoomInput {
    id: ID
    host: String
    slug: String
    started: Boolean
    players: [GameUserInput]
    settings: GameSettingsInput
    game: GameInput
    triggerRound: Boolean
  }

  input GameSettingsInput {
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

  input GameInput {
    rounds: Int
    timeLimit: Int
    currentRound: Int
    currentTurn: Int
    countDownTime: Int
    roundTime: Int
    roundTimeElapsed: Boolean
    cards: [GameCardInput]
    gameOver: Boolean
  }

  input GameCardInput {
    user: ID
    text: String
    revealed: Boolean
    highlighted: Boolean
    selected: Boolean
  }

  extend type Query {
    rooms(id: ID, host: String, playerUid: ID, slug: String): [GameRoom]
  }

  extend type Mutation {
    createRoom(room: GameRoomInput): GameRoom
    updateRoom(room: GameRoomInput): GameRoom
    deleteRoom(host: String): String
  }

  type Subscription {
    roomUpdated(slug: String!): GameRoom
    roomDeleted(slug: String!): GameRoom
  }
`

module.exports = Room