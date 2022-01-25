const User = require('../../models/User')
const Event = require('../../models/Event')
const checkAuth = require('../../utils/checkAuth')

module.exports = {
  Query: {
    async getAllEvent(_, __, context) {
      const user = checkAuth(context)

      if (!user) {
        throw new UserInputError('User Must Login', {
          errors: {
            login: 'User Not Login',
          },
        })
      } else if (!user.isManager) {
        throw new UserInputError('User Must Be Manager', {
          errors: {
            login: 'User Not Manager',
          },
        })
      }

      const events = await Event.find({
        user: { $ne: user.id },
      }).sort({
        createdAt: -1,
      })

      let idx = 0
      for (const evt of events) {
        const { _id, user: userId, ...evtRest } = evt._doc

        const evtUser = await User.findById(userId)
        const evtObj = {
          id: _id,
          ...evtRest,
          user: evtUser,
        }

        events[idx] = evtObj
        ++idx
      }

      return events
    },
    async getSelfEvent(_, __, context) {
      const user = checkAuth(context)

      if (!user) {
        throw new UserInputError('User Must Login', {
          errors: {
            login: 'User Not Login',
          },
        })
      }

      const events = await Event.find({ user: user.id }).sort({
        createdAt: -1,
      })

      events.forEach((evt, idx, theArray) => {
        const { _id, ...evtRest } = evt._doc
        const evtObj = {
          id: _id,
          ...evtRest,
          user,
        }
        theArray[idx] = evtObj
      })

      return events
    },
  },
  Mutation: {
    async createNewEvent(_, { createEventInput }, context) {
      const user = checkAuth(context)

      if (!user) {
        throw new UserInputError('User Must Login', {
          errors: {
            login: 'User Not Login',
          },
        })
      }

      const newEvent = new Event({
        user: user.id,
        ...createEventInput,
      })

      const res = await newEvent.save()

      return { id: res._id, ...res._doc, user: user }
    },
    async updateCompEvent(_, { evtId }, context) {
      const user = checkAuth(context)

      if (!user) {
        throw new UserInputError('User Must Login', {
          errors: {
            login: 'User Not Login',
          },
        })
      }

      try {
        const updateComplete = await Event.findByIdAndUpdate(
          {
            _id: evtId,
          },
          {
            $set: {
              isCompleted: true,
            },
          },
          { new: true }
        )

        return updateComplete
      } catch (err) {
        throw new Error(err)
      }
    },
    async updateRescEvent(_, { evtId, planDate }, context) {
      const user = checkAuth(context)

      if (!user) {
        throw new UserInputError('User Must Login', {
          errors: {
            login: 'User Not Login',
          },
        })
      }

      try {
        const updateReschedule = await Event.findByIdAndUpdate(
          {
            _id: evtId,
          },
          {
            $set: {
              isRescheduled: true,
            },
          },
          { new: false }
        )

        if (updateReschedule) {
          const { _id, ...updateRescheduleRest } = updateReschedule._doc
          const newEvent = new Event({
            ...updateRescheduleRest,
            planDate,
          })

          const res = await newEvent.save()

          return { id: res._id, ...res._doc, user: user }
        }
      } catch (err) {
        throw new Error(err)
      }
    },
    async updateCancelEvent(_, { evtId }, context) {
      const user = checkAuth(context)

      if (!user) {
        throw new UserInputError('User Must Login', {
          errors: {
            login: 'User Not Login',
          },
        })
      }

      try {
        const deleteEvent = Event.findByIdAndUpdate(
          { _id: evtId },
          {
            $set: {
              isCancelled: true,
            },
          },
          { new: true }
        )

        return deleteEvent
      } catch (err) {
        throw new Error(err)
      }
    },
  },
}
