const { ApolloError } = require('apollo-server-errors')
const { PubSub, withFilter } = require('graphql-subscriptions')
const { nanoid } = require('nanoid')
const roomHelpers = require('../utils/functions/roomHelpers')
const messages = require('../utils/functions/messages')
const pubsub = new PubSub()

const Room = {
	Query: {
		async rooms(parent, { id, host, playerUid, slug }, { admin }) {
			let rooms = []

			if (id || host || slug) {
				room = await roomHelpers.fetchRoom(admin, {
					identifier: id ? 'id' : slug ? 'slug' : 'host', value: id || host || slug
				})
				return room ? [room] : []
			}

			if (playerUid) {
				room = await roomHelpers.fetchRoomWithPlayer(admin, playerUid)
				return room ? [room] : []
			}

			rooms = await admin
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
			room = JSON.parse(JSON.stringify(room))
			if (await roomHelpers.roomExists(admin, room.host))
				throw new ApolloError(messages.errors.USER_ALREADY_HOSTING)

			// Get a key for a new room.
			const newRoomKey = admin
				.database()
				.ref()
				.child('/rooms')
				.push()
				.key
			
			const userRecord = await roomHelpers.fetchUserData(admin, room.host)

			// Write the new data.
			let updates = {}
			updates[`/rooms/${newRoomKey}`] = {
				id: newRoomKey,
				slug: nanoid(5),
				players: [
					{
						displayName: userRecord.displayName,
						email: userRecord.email || null,
						photoURL: userRecord.photoURL || null,
						phoneNumber: userRecord.phoneNumber || null,
						uid: userRecord.uid,
						anonymousUser: false,
						isHost: true
					}
				],
				...room
			}
			
			return admin
				.database()
				.ref()
				.update(updates)
				.then(() => roomHelpers.fetchRoom(admin, { identifier: 'host', value: room.host }))
		},
		async updateRoom(parent, { room }, { admin, timerModule }) {
			room = JSON.parse(JSON.stringify(room))

			const currentRoom = await roomHelpers.fetchRoom(admin, { identifier: 'id', value: room.id })

			if (!currentRoom)
				throw new ApolloError(messages.errors.ROOM_DOES_NOT_EXIST)
			
			if (room.triggerRound) {
				// Start Countdowns
				roomHelpers.updateTimers(admin, timerModule, pubsub, room)	
			}

			room = roomHelpers.checkHostIsAvailable(room)

			if(room.players.length) {
				// Write the new data.
				// TO-DO: we need checks to make sure invalid data isn't written to db
				let updates = {}
				updates[`/rooms/${room.id}`] = {
					...currentRoom,
					...room,
					triggerRound: false
				}

				return admin
					.database()
					.ref()
					.update(JSON.parse(JSON.stringify(updates)))
					.then(() => {
						const updatedRoom = roomHelpers.fetchRoom(admin, { identifier: 'id', value: room.id })
						
						// publish subscription update
						console.log('---publish room update---')
						pubsub.publish('ROOM_UPDATED', { roomUpdated: updatedRoom })

						return updatedRoom
					})
			} else {
				return admin
					.database()
					.ref(`/rooms/${room.id}`)
					.remove()
					.then(() => {
						console.log('room deleted---')
						return room
					})
			}
			
		},
		async deleteRoom(parent, { host }, { admin, timerModule }) {
			const room = await roomHelpers.fetchRoom(admin, { identifier: 'host', value: host })

			if (!room)
				throw new ApolloError(messages.errors.NO_ROOM_FOUND)

			if (room.host !== host)
				throw new ApolloError(messages.errors.ROOM_CANNOT_MODIFY_REASON_PERMISSIONS)
			
			roomHelpers.removeTimer(timerModule, room)	
			return admin
				.database()
				.ref(`/rooms/${room.id}`)
				.remove()
				.then(() => {
					console.log('room deleted---')
					// publish subscription update
					pubsub.publish('ROOM_DELETED', { roomDeleted: room })
					return room
				})
		}
	},
	Subscription: {
		// Listening for subscription
		roomUpdated: {
			subscribe: withFilter(() => pubsub.asyncIterator('ROOM_UPDATED'), (payload, variables) => {
				return payload.roomUpdated.then(room => {
					return room.slug === variables.slug
				})				
			}),
		},
		roomDeleted: {
			subscribe: withFilter(() => pubsub.asyncIterator('ROOM_DELETED'), (payload, variables) => {
				console.log(`payload.roomDeleted.slug === variables.slug`)
				console.log(payload.roomDeleted.slug)
				console.log(variables.slug)
				return payload.roomDeleted.slug === variables.slug
			}),
		}
	}
}

module.exports = Room