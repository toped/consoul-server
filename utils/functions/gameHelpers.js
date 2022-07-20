
const { ApolloError } = require('apollo-server-errors')
const _ = require('lodash')

const fetchGame = async (admin, identifier) => {
	if (!identifier || !identifier.value) throw new ApolloError('Must provide a title to fetch game')

	const game = await admin
		.database()
		.ref('games')
		.orderByChild(identifier.identifier)
		.equalTo(identifier.value)
		.once('value')
		.then(snap => { return snap.val() })
		.then(val => val && Object.keys(val).map(key => val[key])[0])
	return game
}

const gameExists = (admin, title) =>
	fetchGame(admin, { identifier: 'title', value: title })

const fetchMemes = async (admin, seenMemes) => {

	var bucket = admin.storage().bucket()

	const files = await bucket
		.getFiles()
		.then((data) => {
			const files = data[0]
			return files
		}).catch((err)=>{
			console.warn(
				`
      ****************
      ${err}
      `
			)
		})

	// get image urls
	let requests = []
	files.forEach((file) => {
		requests.push(new Promise((resolve, reject) => {
			generateV4ReadSignedUrl(bucket, file.metadata.name)
				.then((data) => resolve(data))
				.catch((err) => reject(err))
		}))
	})

	return Promise.all(requests).then((values) => {
		let memes = values
		memes.shift()

		if(seenMemes && seenMemes.length > 0) {
			memes = memes.filter(meme=>{
				// console.log(meme)
				// console.log(meme.match(/(https:.*)\?/gi)[0])
				return !seenMemes.includes(meme.match(/(https:.*)\?/gi)[0])
			})

		}

		return _.shuffle(memes)
	})
}

generateV4ReadSignedUrl = async (bucket, filename) => {
	// These options will allow temporary read access to the file
	const options = {
		version: 'v4',
		action: 'read',
		expires: Date.now() + 15 * 60 * 1000, // 15 minutes
	}

	// Get a v4 signed URL for reading the file
	const [url] = await bucket
		.file(filename)
		.getSignedUrl(options)

	return url
}

module.exports = {
	fetchMemes,
	fetchGame,
	gameExists
}