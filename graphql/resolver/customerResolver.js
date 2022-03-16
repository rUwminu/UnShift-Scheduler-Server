const { UserInputError } = require('apollo-server-express')

const User = require('../../models/User')
const Customer = require('../../models/Customer')
const checkAuth = require('../../utils/checkAuth')
const { PubSub, withFilter } = require('graphql-subscriptions')

const pubsub = new PubSub()

module.exports = {
  Query: {
    async getAllCustomers(_, __, context) {
      const user = checkAuth(context)

      if (!user) {
        throw new UserInputError('User Must Login', {
          errors: {
            login: 'User Not Login',
          },
        })
      }

      const customers = await Customer.find({
        user: { $ne: user.id },
      })

      return customers
    },
    async getSelfCustomers(_, __, context) {
      const user = checkAuth(context)

      if (!user) {
        throw new UserInputError('User Must Login', {
          errors: {
            login: 'User Not Login',
          },
        })
      }

      const customers = await Customer.find({
        user: user.id,
      })

      return customers
    },
  },
  Mutation: {
    async createNewCustomer(_, { createCustomerInput }, context) {
      const user = checkAuth(context)

      if (!user) {
        throw new UserInputError('User Must Login', {
          errors: {
            login: 'User Not Login',
          },
        })
      }

      const newCustomer = new Customer({
        user: user.id,
        ...createCustomerInput,
      })

      const res = await newCustomer.save()

      pubsub.publish('CUSTOMER_CREATED', {
        customerCreated: {
          id: res._id,
          ...res._doc,
          user: user,
        },
      })

      return { id: res._id, ...res._doc }
    },
    async updateExistCustomer(_, { updateCustomerInput }, context) {
      const user = checkAuth(context)

      if (!user) {
        throw new UserInputError('User Must Login', {
          errors: {
            login: 'User Not Login',
          },
        })
      }

      const {
        id,
        personal,
        company,
        position,
        personalcontact,
        companycontact,
        address,
      } = updateCustomerInput

      const findCustomer = await Customer.findById(id)

      if (!findCustomer) {
        throw new Error('User Not Found')
      }

      const updateCustomer = await Customer.findOneAndUpdate(
        { _id: id },
        {
          personal:
            personal.trim() !== '' || personal !== null
              ? personal
              : findCustomer.personal,
          company:
            company.trim() !== '' || company !== null
              ? company
              : findCustomer.company,
          position:
            position.trim() !== '' || position !== null
              ? position
              : findCustomer.position,
          personalcontact:
            personalcontact.trim() !== '' || personalcontact !== null
              ? personalcontact
              : findCustomer.personalcontact,
          companycontact:
            companycontact.trim() !== '' || companycontact !== null
              ? companycontact
              : findCustomer.companycontact,
          address:
            address.trim() !== '' || address !== null
              ? address
              : findCustomer.address,
        },
        { new: true }
      )

      return updateCustomer
    },
    async deleteExistCustomer(_, { cusId }, context) {
      const user = checkAuth(context)

      if (!user) {
        throw new UserInputError('User Must Login', {
          errors: {
            login: 'User Not Login',
          },
        })
      }

      const targetCustomer = await Customer.findById(cusId)

      if (!targetCustomer) {
        throw new Error('Customer Not Found')
      }

      if (user.id.toString() === targetCustomer.user.toString()) {
        await targetCustomer.delete()
        return targetCustomer
      } else {
        throw new Error('Action not allow')
      }
    },
  },
  Subscription: {
    customerCreated: {
      resolve: (payload) => {
        if (payload && payload.customerCreated) {
          return payload.customerCreated
        }
        return payload
      },
      subscribe: withFilter(
        () => pubsub.asyncIterator('CUSTOMER_CREATED'),
        (payload, variables, context) => {
          if (!payload) {
            return false
          }

          const { user } = context

          if (user.isManager) {
            return true
          } else if (payload.customerCreated.user.id === user.id) {
            return true
          } else {
            return false
          }
        }
      ),
    },
  },
}
