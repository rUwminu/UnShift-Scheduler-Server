const { PubSub, withFilter } = require('graphql-subscriptions')
const { UserInputError, AuthenticationError } = require('apollo-server-express')

const User = require('../../models/User')
const Event = require('../../models/Event')
const checkAuth = require('../../utils/checkAuth')

const pubsub = new PubSub()

module.exports = {
  Query: {
    async getAllEvent(_, { startDate, endDate }, context) {
      const user = checkAuth(context)

      if (!user) {
        throw new UserInputError('User Must Login', {
          errors: {
            login: 'User Not Login',
          },
        })
      }

      if (!user.isManager) {
        throw new UserInputError('User Must Be Manager', {
          errors: {
            login: 'User Not Manager',
          },
        })
      }

      const events = await Event.find({
        user: { $ne: user.id },
        planDate: {
          $gte: new Date(startDate).toISOString(),
          $lte: new Date(endDate).toISOString(),
        },
      }).sort({
        planDate: -1,
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
    async getSelfEvent(_, { startDate, endDate }, context) {
      const user = checkAuth(context)

      if (!user) {
        throw new UserInputError('User Must Login', {
          errors: {
            login: 'User Not Login',
          },
        })
      }

      // const events = await Event.find({
      //   user: user.id,
      //   $expr: {
      //     $or: [
      //       {
      //         $and: [
      //           { $eq: [{ $month: { $toDate: '$planDate' } }, month] },
      //           { $eq: [{ $year: { $toDate: '$planDate' } }, year] },
      //         ],
      //       },
      //     ],
      //   },
      // }).sort({
      //   createdAt: -1,
      // })

      const events = await Event.find({
        user: user.id,
        planDate: {
          $gte: new Date(startDate).toISOString(),
          $lte: new Date(endDate).toISOString(),
        },
      }).sort({
        planDate: -1,
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
    async getSelfSelectedEvent(_, { startDate, endDate }, context) {
      const user = checkAuth(context)

      if (!user) {
        throw new UserInputError('User Must Login', {
          errors: {
            login: 'User Not Login',
          },
        })
      }

      var events = []
      var endDateToDay = ''
      if (endDate && startDate) {
        endDateToDay = new Date(endDate)
        endDateToDay.setDate(endDateToDay.getDate() + 1)
        events = await Event.find({
          user: user.id,
          planDate: {
            $gte: new Date(startDate).toISOString(),
            $lte: endDateToDay.toISOString(),
          },
        }).sort({
          planDate: -1,
        })
      } else if (!endDate && startDate) {
        events = await Event.find({
          user: user.id,
          planDate: {
            $gte: new Date(startDate).toISOString(),
          },
        }).sort({
          planDate: -1,
        })
      } else if (!startDate && endDate) {
        endDateToDay = new Date(endDate)
        endDateToDay.setDate(endDateToDay.getDate() + 1)
        events = await Event.find({
          user: user.id,
          planDate: {
            $lte: endDateToDay.toISOString(),
          },
        }).sort({
          planDate: -1,
        })
      } else {
        events = await Event.find({
          user: user.id,
        }).sort({
          planDate: -1,
        })
      }

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
    async getAllSelectedEvent(_, { startDate, endDate }, context) {
      const user = checkAuth(context)

      if (!user && !user.isManager) {
        throw new UserInputError('User Must Login', {
          errors: {
            login: 'User Not Login',
          },
        })
      }

      var events = []
      if (endDate && startDate) {
        events = await Event.find({
          planDate: {
            $gte: new Date(startDate).toISOString(),
            $lte: new Date(endDate).toISOString(),
          },
        }).sort({
          planDate: -1,
        })
      } else if (!endDate && startDate) {
        events = await Event.find({
          planDate: {
            $gte: new Date(startDate).toISOString(),
          },
        }).sort({
          planDate: -1,
        })
      } else if (!startDate && endDate) {
        events = await Event.find({
          planDate: {
            $lte: new Date(endDate).toISOString(),
          },
        }).sort({
          planDate: -1,
        })
      } else {
        events = await Event.find({}).sort({
          planDate: -1,
        })
      }

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

      pubsub.publish('EVENT_CREATED', {
        eventCreated: {
          id: res._id,
          ...res._doc,
          user: user,
        },
      })

      return { id: res._id, ...res._doc, user: user }
    },
    async updateCompEvent(_, { evtId }, context) {
      var now = new Date()
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
              compDate: now.toISOString(),
            },
          },
          { new: true }
        )

        const { _id, ...restUpdateComplete } = updateComplete._doc

        const userInfo = await User.findById(restUpdateComplete.user)

        pubsub.publish('EVENT_UPDATED', {
          eventUpdated: {
            id: _id,
            ...restUpdateComplete,
            user: userInfo,
          },
        })

        return updateComplete
      } catch (err) {
        throw new Error(err)
      }
    },
    async updateForeEvent(_, { evtId }, context) {
      const user = checkAuth(context)

      if (!user) {
        throw new UserInputError('User Must Login', {
          errors: {
            login: 'User Not Login',
          },
        })
      }

      try {
        const updateForecast = await Event.findByIdAndUpdate(
          {
            _id: evtId,
          },
          {
            $set: {
              isCompleted: false,
              compDate: '',
            },
          },
          { new: true }
        )

        const { _id, ...restUpdateForecast } = updateForecast._doc

        const userInfo = await User.findById(restUpdateForecast.user)

        pubsub.publish('EVENT_UPDATED', {
          eventUpdated: {
            id: updateForecast._id,
            ...updateForecast._doc,
            user: userInfo,
          },
        })

        return updateForecast
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

          const userInfo = await User.findOne({
            _id: updateRescheduleRest.user,
          })

          const newEvent = new Event({
            ...updateRescheduleRest,
            planDate,
          })

          const res = await newEvent.save()

          pubsub.publish('EVENT_UPDATED', {
            eventUpdated: {
              id: updateReschedule._id,
              ...updateReschedule._doc,
              user: userInfo,
              isRescheduled: true,
            },
          })

          pubsub.publish('EVENT_CREATED', {
            eventCreated: {
              id: res._id,
              ...res._doc,
              user: userInfo,
            },
          })

          return { id: res._id, ...res._doc, user: user }
        }
      } catch (err) {
        throw new Error(err)
      }
    },
    async updateCancelEvent(_, { evtId, remark }, context) {
      var now = new Date()
      const user = checkAuth(context)

      if (!user) {
        throw new UserInputError('User Must Login', {
          errors: {
            login: 'User Not Login',
          },
        })
      }

      try {
        const cancelEvent = await Event.findByIdAndUpdate(
          { _id: evtId },
          {
            $set: {
              isCancelled: true,
              compDate: now.toISOString(),
              remark,
            },
          },
          { new: true }
        )

        pubsub.publish('EVENT_UPDATED', {
          eventUpdated: {
            id: cancelEvent._id,
            ...cancelEvent._doc,
            user: user,
          },
        })

        return cancelEvent
      } catch (err) {
        throw new Error(err)
      }
    },
    async deleteEvent(_, { evtId }, context) {
      const user = checkAuth(context)

      if (!user) {
        throw new UserInputError('User Must Login', {
          errors: {
            login: 'User Not Login',
          },
        })
      }

      try {
        const event = await Event.findById(evtId)

        if (!event) throw new AuthenticationError('Ticket Not Found')

        await event.delete()

        pubsub.publish('EVENT_DELETED', {
          eventDeleted: {
            id: event._id,
            ...event._doc,
            user: user,
          },
        })

        return 'Event Deleted'
      } catch (err) {
        throw new Error(err)
      }
    },
  },
  Subscription: {
    eventCreated: {
      resolve: (payload, args, context) => {
        if (payload && payload.eventCreated) {
          return payload.eventCreated
        }
        return payload
      },
      subscribe: withFilter(
        () => pubsub.asyncIterator('EVENT_CREATED'),
        (payload, variables, context) => {
          if (!payload) {
            return false
          }

          const { user } = context

          if (user.isManager) {
            return true
          } else if (payload.eventCreated.user.id === user.id) {
            return true
          } else {
            return false
          }
        }
      ),
    },
    eventUpdated: {
      resolve: (payload) => {
        if (payload && payload.eventUpdated) {
          return payload.eventUpdated
        }
        return payload
      },
      subscribe: withFilter(
        () => pubsub.asyncIterator('EVENT_UPDATED'),
        (payload, variables, context) => {
          if (!payload) {
            return false
          }

          const { user } = context

          if (user.isManager) {
            return true
          } else if (payload.eventUpdated.user.id === user.id) {
            return true
          } else {
            return false
          }
        }
      ),
    },
    eventDeleted: {
      resolve: (payload) => {
        if (payload && payload.eventDeleted) {
          return payload.eventDeleted
        }
        return payload
      },
      subscribe: withFilter(
        () => pubsub.asyncIterator('EVENT_DELETED'),
        (payload, variables, context) => {
          if (!payload) {
            return false
          }

          const { user } = context

          if (user.isManager) {
            return true
          } else if (payload.eventDeleted.user.id === user.id) {
            return true
          } else {
            return false
          }
        }
      ),
    },
  },
}
