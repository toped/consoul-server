const { ApolloError } = require('apollo-server')
const gameHelpers = require('../utils/functions/gameHelpers')
const messages = require('../utils/functions/messages')

const Game = {
	Query: {
		async categories(parent, _, { admin }) {
			return admin
				.database()
				.ref('categories')
				.once('value')
				.then(snap => snap.val())
				.then(val => val && Object.keys(val).map(key => val[key]) || [])
				.catch((err) => {
					return new ApolloError(err)
				})
		},
		async category(parent, { title }, { admin }) {
			return gameHelpers.fetchCategory(admin, { identifier: 'title', value: title })
		}
	},
	Mutation: {
		async createCategory(parent, { category }, { admin }) {
			// Check if category with title exists
			if (await gameHelpers.categoryExists(admin, category.title))
				return new ApolloError(messages.errors.CATEGORY_EXISTS)

			// Get a key for a new room.
			const newCategoryKey = admin
				.database()
				.ref()
				.child('/categories')
				.push()
				.key
			// Write the new data.
			let updates = {}
			updates[`/categories/${category.title}`] = {
				id: newCategoryKey,
				...category
			}

			return admin
				.database()
				.ref()
				.update(updates)
				.then(() => gameHelpers.fetchCategory(admin, { identifier: 'title', value: category.title }))
		},
		async deleteCategory(parent, { title }, { admin }) {
			const category = await gameHelpers.fetchCategory(admin, { identifier: 'title', value: title })

			if (!category)
				return new ApolloError(messages.errors.NO_CATEGORY_FOUND)

			return admin
				.database()
				.ref(`/categories/${title}`)
				.remove()
				.then(() => 'success')
		}
	}
}

module.exports = Game