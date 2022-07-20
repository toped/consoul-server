const { gql } = require('apollo-server-core')

const GameData = gql`
  type Game {
    id: String
    title: String
    description: String
    imgSrc: String
    order: Int
    requirements: RequirementOptions
    setupOptions: SetupOptions
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

  type SetupOptions {
    rounds: Int
    maxPlayers: Int
    timeLimit: Int
  }

  type RequirementOptions {
    minPlayers: Int
  }

  input GameInput {
    title: String
    description: String
    imgSrc: String
    order: Int
    requirements: RequirementOptionsInput
    setupOptions: SetupOptionsInput
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

  input SetupOptionsInput {
    rounds: Int
    maxPlayers: Int
    timeLimit: Int
  }

  input RequirementOptionsInput {
    minPlayers: Int
  }

  extend type Query {
    games: [Game]
    game(title: String): Game
  }

  extend type Mutation {
    createGame(game: GameInput): Game
    deleteGame(title: String): String
  }
`

module.exports = GameData