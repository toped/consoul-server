const { gql } = require('apollo-server')

const GameData = gql`
  type Category {
    id: String
    title: String
    description: String
    imgSrc: String
    order: Int
  }

  input CategoryInput {
    title: String
    description: String
    imgSrc: String
    order: Int
  }

  extend type Query {
    categories: [Category]
    category(title: String): Category
  }

  extend type Mutation {
    createCategory(category: CategoryInput): Category
    deleteCategory(title: String): String
  }
`

module.exports = GameData