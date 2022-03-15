const { PubSub, withFilter } = require('graphql-subscriptions')
const { UserInputError, AuthenticationError } = require('apollo-server-express')

const User = require('../../models/User')
const Event = require('../../models/Event')
const Customer = require('../../models/Customer')
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

      const data = await Promise.all(
        events.map(async (x) => {
          const { _id, user: userId, customer, ...restEvt } = x._doc
          const evtUser = await User.findById(userId)
          const cusInfo = await Customer.findById(customer.cusId)

          return {
            id: _id,
            user: evtUser,
            customer: { cusId: cusInfo._id, ...cusInfo._doc },
            ...restEvt,
          }
        })
      )

      return data
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

      try {
        const events = await Event.find({
          user: user.id,
          planDate: {
            $gte: new Date(startDate).toISOString(),
            $lte: new Date(endDate).toISOString(),
          },
        }).sort({
          planDate: -1,
        })

        const data = await Promise.all(
          events.map(async (x) => {
            const { _id, customer, ...restEvt } = x._doc
            const cusInfo = await Customer.findById(customer.cusId)

            return {
              id: _id,
              user,
              customer: { cusId: cusInfo._id, ...cusInfo._doc },
              ...restEvt,
            }
          })
        )

        return data
      } catch (err) {
        throw new Error(err)
      }
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
      let res
      let cusRes
      const user = checkAuth(context)

      if (!user) {
        throw new UserInputError('User Must Login', {
          errors: {
            login: 'User Not Login',
          },
        })
      }

      if (
        createEventInput.customer.cusId === '' ||
        createEventInput.customer.cusId === null
      ) {
        const newCustomer = new Customer({
          user: user.id,
          company: createEventInput.customer.company,
          personal: 'Info Needed',
          position: 'Info Needed',
          personalcontact: '',
          companycontact: '07 0001111',
          address: 'Please Update This Customer Info As Needed.',
        })

        cusRes = await newCustomer.save()

        const newEvent = new Event({
          ...createEventInput,
          user: user.id,
          customer: { cusId: newCustomer._id },
        })

        pubsub.publish('EVENT_CUSTOMER_CREATED', {
          eventCustomerCreated: {
            id: cusRes._id,
            ...cusRes._doc,
            user: user,
          },
        })

        res = await newEvent.save()
      } else {
        const newEvent = new Event({
          user: user.id,
          ...createEventInput,
        })

        res = await newEvent.save()
      }

      const cusInfo = await Customer.findById(res.customer.cusId)

      pubsub.publish('EVENT_CREATED', {
        eventCreated: {
          id: res._id,
          ...res._doc,
          user: user,
          customer: {
            cusId: cusInfo._id,
            ...cusInfo._doc,
          },
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

        const { _id, customer, ...restUpdateComplete } = updateComplete._doc

        const userInfo = await User.findById(restUpdateComplete.user)
        const cusInfo = await Customer.findById(customer.cusId)

        pubsub.publish('EVENT_UPDATED', {
          eventUpdated: {
            id: _id,
            ...restUpdateComplete,
            user: userInfo,
            customer: {
              cusId: cusInfo._id,
              ...cusInfo._doc,
            },
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

        const { _id, customer, ...restUpdateForecast } = updateForecast._doc

        const userInfo = await User.findById(restUpdateForecast.user)
        const cusInfo = await Customer.findById(customer.cusId)

        pubsub.publish('EVENT_UPDATED', {
          eventUpdated: {
            id: _id,
            ...restUpdateForecast,
            user: userInfo,
            customer: {
              cusId: cusInfo._id,
              ...cusInfo._doc,
            },
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
          const cusInfo = await Customer.findById(
            updateRescheduleRest.customer.cusId
          )

          const newEvent = new Event({
            ...updateRescheduleRest,
            planDate,
          })

          const res = await newEvent.save()

          pubsub.publish('EVENT_UPDATED', {
            eventUpdated: {
              id: _id,
              ...updateRescheduleRest,
              user: userInfo,
              customer: {
                cusId: cusInfo._id,
                ...cusInfo._doc,
              },
            },
          })

          pubsub.publish('EVENT_CREATED', {
            eventCreated: {
              id: res._id,
              ...res._doc,
              user: userInfo,
              customer: {
                cusId: cusInfo._id,
                ...cusInfo._doc,
              },
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

        const { _id, ...updateCancelRest } = cancelEvent._doc

        const userInfo = await User.findOne({
          _id: updateCancelRest.user,
        })
        const cusInfo = await Customer.findById(updateCancelRest.customer.cusId)

        pubsub.publish('EVENT_UPDATED', {
          eventUpdated: {
            id: _id,
            ...updateCancelRest,
            user: userInfo,
            customer: {
              cusId: cusInfo._id,
              ...cusInfo._doc,
            },
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
    eventCustomerCreated: {
      resolve: (payload) => {
        if (payload && payload.eventCustomerCreated) {
          return payload.eventCustomerCreated
        }
        return payload
      },
      subscribe: withFilter(
        () => pubsub.asyncIterator('EVENT_CUSTOMER_CREATED'),
        (payload, variables, context) => {
          if (!payload) {
            return false
          }

          const { user } = context

          if (user.isManager) {
            return true
          } else if (payload.eventCustomerCreated.user.id === user.id) {
            return true
          } else {
            return false
          }
        }
      ),
    },
  },
}
