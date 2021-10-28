const { ApolloError } = require('apollo-server')

const slugify = (text) =>
	text
		.toString()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^\w-]+/g, '')
		.replace(/--+/g, '-')

const fetchRoom = async (admin, identifier) => {
	if (!identifier || !identifier.value) throw new ApolloError('Must provide an id or slug to fetch room')

	const room = await admin
		.database()
		.ref('rooms')
		.orderByChild(identifier.identifier)
		.equalTo(identifier.value)
		.once('value')
		.then(snap => { return snap.val() })
		.then(val => val && Object.keys(val).map(key => val[key])[0])
	return room
}

const roomExists = (admin, host) =>
	fetchRoom(admin, { identifier: 'host', value: host })

const userHasRoomWithName = (admin, uid, name) =>
	fetchUserRoom(admin, uid)
		.then(val => val ? val.filter(b => b.name === name).length > 0 : false)


module.exports = {
	slugify, 
	fetchRoom, 
	roomExists, 
	userHasRoomWithName 
}