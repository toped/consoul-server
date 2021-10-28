const { ApolloError, PubSub } = require('apollo-server')
const { Timer } = require('easytimer.js')
const { nanoid } = require('nanoid')
const roomHelpers = require('../utils/functions/roomHelpers')
const messages = require('../utils/functions/messages')
const pubsub = new PubSub()

const Room = {
	Query: {
		async rooms(parent, { id, host, slug }, { admin }) {

			let rooms = []

			if (id || host || slug) {
				room = await roomHelpers.fetchRoom(admin, {
					identifier: id ? 'id' : slug ? 'slug' : 'host', value: id || host || slug
				})
				return room ? [room] : []
			}

			if (!id && !host) rooms = await admin
				.database()
				.ref('rooms')
				.once('value')
				.then(snap => snap.val())
				.then(val => val && Object.keys(val).map(key => val[key])) || []

			return rooms
		}
	},
	GameRoom: {
		
	},
	Mutation: {
		async createRoom(parent, { room }, { admin }) {
			// Check if user has room with same name
			if (await roomHelpers.roomExists(admin, room.host))
				throw new ApolloError(messages.errors.USER_ALREADY_HOSTING)

			// Get a key for a new room.
			const newRoomKey = admin
				.database()
				.ref()
				.child('/rooms')
				.push()
				.key

			// Write the new data.
			let updates = {}
			updates[`/rooms/${newRoomKey}`] = {
				id: newRoomKey,
				slug: nanoid(5),
				...room
			}

			return admin
				.database()
				.ref()
				.update(updates)
				.then(() => roomHelpers.fetchRoom(admin, { identifier: 'host', value: room.host }))
		},
		async updateRoom(parent, { room }, { admin, timerModule }) {
			const currentRoom = await roomHelpers.fetchRoom(admin, { identifier: 'id', value: room.id })

			if (!currentRoom)
				throw new ApolloError(messages.errors.ROOM_DOES_NOT_EXIST)
			
			// Write the new data.
			// TO-DO: we need checks to make sure invalid data isn't written to db
			let updates = {}
			updates[`/rooms/${room.id}`] = {
				...room
			}

			return admin
				.database()
				.ref()
				.update(JSON.parse(JSON.stringify(updates)))
				.then(() => {
					const updatedRoom = roomHelpers.fetchRoom(admin, { identifier: 'id', value: room.id })
					
					// publish subscription update
					pubsub.publish('ROOM_UPDATED', { roomUpdated: updatedRoom })

					return updatedRoom
				})
		},
		async deleteRoom(parent, { host }, { admin }) {
			const room = await roomHelpers.fetchRoom(admin, { identifier: 'host', value: host })

			if (!room)
				throw new ApolloError(messages.errors.NO_ROOM_FOUND)

			if (room.host !== host)
				throw new ApolloError(messages.errors.ROOM_CANNOT_MODIFY_REASON_PERMISSIONS)

			return admin
				.database()
				.ref(`/rooms/${room.id}`)
				.remove()
				.then(() => 'success')
		}
	},
	Subscription: {
		// Listening fro subscription
		roomUpdated: {
			// More on pubsub later
			subscribe: () => pubsub.asyncIterator(['ROOM_UPDATED']),
		}
	}
}

module.exports = Room