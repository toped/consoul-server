const { ApolloError } = require('apollo-server-errors')
const { Timer } = require('easytimer.js')

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
	if (!identifier || !identifier.value) throw new ApolloError('Must provide a host, id, or slug to fetch room')

	const room = await admin
		.database()
		.ref('rooms')
		.orderByChild(identifier.identifier)
		.equalTo(identifier.value)
		.once('value')
		.then(snap => { return snap.val() })
		.then(val => val && Object.keys(val).map(key => val[key])[0])
		.catch(err => console.error(err))
	return room
}

const fetchRoomWithPlayer = async (admin, playerUid) => {
	if (!playerUid) throw new ApolloError('Must provide player uid to fetch room with player')
	
	const room = await admin
		.database()
		.ref('rooms')
		.once('value')
		.then(snap => { return snap.val() })
		.then(val => {
			let foundRoom = null
			if (val) {
				for (let i = 0; i < Object.keys(val).map(key => val[key]).length; i++) {
					const playerUidArr = Object.keys(val).map(key => val[key])[i].players.map(p => p.uid)
					if (playerUidArr.includes(playerUid)) {
						foundRoom = Object.keys(val).map(key => val[key])[i]
						break
					}
				}
			} else {
				return null
			}

			return foundRoom
		})
		.catch(err => console.error(err))

	return room    
}


const roomExists = (admin, host) =>
	fetchRoom(admin, { identifier: 'host', value: host })

const userHasRoomWithName = (admin, uid, name) =>
	fetchUserRoom(admin, uid)
		.then(val => val ? val.filter(b => b.name === name).length > 0 : false)

const fetchUserData = async (admin, uid) => {
	return await admin.auth().getUser(uid)
		.then((userRecord) => {
			// See the UserRecord reference doc for the contents of userRecord.
			return userRecord.toJSON()
		})
		.catch(err => { throw new ApolloError(err)})
}

const updateTimers = (admin, timerModule, pubsub, room) => {
	const timers = timerModule.getTimers()
	const timer = timers[room.id]
	
	if (!timer) {
		const countdownTimerInstance = new Timer()
		const roundTimerInstance = new Timer()
				
		timerModule.addTimer(room.id, countdownTimerInstance)

		let countdownTimeLeft = 4
		let roundTimerTimeLeft = room.settings.timeLimit

		// 3 - 2 - 1 - GO!
		countdownTimerInstance.start({ countdown: true, startValues: { seconds: countdownTimeLeft } })

		countdownTimerInstance.addEventListener('secondsUpdated', (e) => {
			const seconds = e.detail.timer.getTotalTimeValues().seconds
			admin
				.database()
				.ref(`/rooms/${room.id}/game/countDownTime`)
				.set(seconds, (error) => {
					if (error) {
						console.log('Timer error.' + error)
					} else {
						const updatedRoom = fetchRoom(admin, { identifier: 'id', value: room.id })
						console.log('***publish timer change***')
						pubsub.publish('ROOM_UPDATED', { roomUpdated: updatedRoom })
					}
				})
		})
		countdownTimerInstance.addEventListener('targetAchieved', (e) => {
			timerModule.addTimer(room.id, roundTimerInstance)
			roundTimerInstance.start({ countdown: true, startValues: { seconds: roundTimerTimeLeft } })
		})

		roundTimerInstance.addEventListener('secondsUpdated', (e) => {
			const seconds = e.detail.timer.getTotalTimeValues().seconds
			admin
				.database()
				.ref(`/rooms/${room.id}/game/roundTime`)
				.set(seconds, (error) => {
					if (error) {
						console.log('Timer error.' + error)
					} else {
						const updatedRoom = fetchRoom(admin, { identifier: 'id', value: room.id })
						console.log('***publish timer change***')
						pubsub.publish('ROOM_UPDATED', { roomUpdated: updatedRoom })
					}
				})
		})
		roundTimerInstance.addEventListener('targetAchieved', (e) => {
			timerModule.removeTimer(room.id)

			// let client know the round ended
			admin
				.database()
				.ref(`/rooms/${room.id}/game/roundTimeElapsed`)
				.set(true, (error) => {
					if (error) {
						console.log('Timer error.' + error)
					} else {
						const updatedRoom = fetchRoom(admin, { identifier: 'id', value: room.id })
						console.log('***publish timer change***')
						pubsub.publish('ROOM_UPDATED', { roomUpdated: updatedRoom })
					}
				})
		})
	}
}

module.exports = {
	slugify, 
	fetchRoom, 
	roomExists, 
	userHasRoomWithName,
	fetchUserData,
	fetchRoomWithPlayer,
	updateTimers
}