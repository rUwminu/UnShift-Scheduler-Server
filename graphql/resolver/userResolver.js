const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { PubSub, withFilter } = require('graphql-subscriptions')
const { UserInputError } = require('apollo-server-express')

const { SECRET_KEY } = require('../../config')
const {
  validateRegisterInput,
  validateLoginInput,
} = require('../../utils/validators')
const User = require('../../models/User')
const checkAuth = require('../../utils/checkAuth')

const pubsub = new PubSub()

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      isManager: user.isManager,
    },
    SECRET_KEY,
    { expiresIn: '10d' }
  )
}

module.exports = {
  Query: {
    async getUsers(_, __, context) {
      const user = checkAuth(context)

      if (!user) {
        throw new Error('User Not Authorize')
      }

      try {
        const users = await User.find({ _id: { $ne: user.id } }).sort({
          createdAt: -1,
        })
        return users
      } catch (err) {
        throw new Error(err)
      }
    },
    async getUser(_, { userId }) {
      try {
        const user = await User.findById(userId)

        if (user) {
          return user
        } else {
          throw new Error('User not found')
        }
      } catch (err) {
        throw new Error('User not found')
      }
    },
  },
  Mutation: {
    async login(_, { email, password }) {
      const { errors, valid } = validateLoginInput(email, password)
      const user = await User.findOne({ email })

      if (!valid) {
        throw new UserInputError(`Errors`, { errors })
      }

      if (!user) {
        errors.email = 'Email not found'
        throw new UserInputError('Error', { errors })
      }

      const match = await bcrypt.compare(password, user.password)
      if (!match) {
        errors.password = 'Wrong password'
        throw new UserInputError('Error', { errors })
      }

      const token = generateToken(user)

      return {
        ...user._doc,
        id: user._id,
        token,
      }
    },
    async register(
      _,
      {
        registerInput: {
          username,
          email,
          password,
          confirmPassword,
          isManager,
        },
      }
    ) {
      // Validate user Data
      const { valid, errors } = validateRegisterInput(
        username,
        email,
        password,
        confirmPassword
      )

      if (!valid) {
        throw new UserInputError(`Errors`, { errors })
      }
      // Make sure user doesnt already exist
      const user = await User.findOne({ email })

      if (user) {
        throw new UserInputError(' email is taken', {
          errors: {
            email: 'This email has taken',
          },
        })
      }

      // hash password and create auth token
      password = await bcrypt.hash(password, 12)

      const newUser = new User({
        email,
        username,
        password,
        isManager,
        createdAt: new Date().toISOString(),
      })

      const res = await newUser.save()

      pubsub.publish('USER_CREATED', {
        userCreated: {
          id: res._id,
          ...res._doc,
        },
      })

      const token = generateToken(res)

      return {
        ...res._doc,
        id: res._id,
        token,
      }
    },
    async updateProfile(
      _,
      { userId, email, username, password, confirmPassword },
      context
    ) {
      const user = checkAuth(context)

      if (!user) {
        throw new Error('User Not Authorize')
      }

      const findUser = await User.findById(userId)

      if (password && password !== '' && password !== null) {
        if (password === confirmPassword) {
          password = await bcrypt.hash(password, 12)
        } else {
          throw new Error('Incorrect Confirm Password')
        }
      }

      try {
        const updateUser = await User.findOneAndUpdate(
          { _id: userId },
          {
            username:
              username !== '' || username !== null
                ? username
                : findUser.username,
            email: email !== '' || email !== null ? email : findUser.email,
            password: password ? password : findUser.password,
          },
          { new: true }
        )

        pubsub.publish('USER_UPDATED', {
          userUpdated: {
            id: updateUser._id,
            ...updateUser._doc,
          },
        })

        const token = generateToken(updateUser)

        return { id: updateUser._id, ...updateUser._doc, token }
      } catch (err) {
        throw new Error(err)
      }
    },
    async changeUserLevel(_, { userId }, context) {
      const user = checkAuth(context)

      if (!user || !user.isManager) {
        throw new Error('User Not Authorize')
      }

      try {
        const findUser = await User.findById(userId)

        if (findUser) {
          const updateUser = await User.findOneAndUpdate(
            { _id: userId },
            {
              isManager: !findUser.isManager,
            },
            { new: true }
          )

          pubsub.publish('USER_UPDATED', {
            userUpdated: {
              id: updateUser._id,
              ...updateUser._doc,
            },
          })

          return { id: updateUser._id, ...updateUser._doc }
        }

        throw new Error('user Not Found')
      } catch (err) {
        throw new Error(err)
      }
    },
    async deleteUser(_, { userId }, context) {
      const user = checkAuth(context)

      try {
        const targetUser = await User.findById(userId)

        if (!targetUser) {
          throw new Error('User Not Found')
        }

        if (user.id === targetUser.id) {
          await targetUser.delete()
          return 'User is deleted'
        } else if (user.isAdmin) {
          await targetUser.delete()
          return 'User is deleted'
        } else {
          throw new Error('Action not allow')
        }
      } catch (err) {
        throw new Error(err)
      }
    },
  },
  Subscription: {
    userCreated: {
      resolve: (payload) => {
        if (payload && payload.userCreated) {
          return payload.userCreated
        }
        return payload
      },
      subscribe: withFilter(
        () => pubsub.asyncIterator('USER_CREATED'),
        (payload, variables, context) => {
          if (!payload) {
            return false
          }

          const { user } = context

          if (user.isManager) {
            return true
          } else {
            return false
          }
        }
      ),
    },
    userUpdated: {
      resolve: (payload) => {
        if (payload && payload.userUpdated) {
          return payload.userUpdated
        }
        return payload
      },
      subscribe: withFilter(
        () => pubsub.asyncIterator('USER_UPDATED'),
        (payload, variables, context) => {
          if (!payload) {
            return false
          }

          const { user } = context

          if (user.isManager) {
            return true
          } else {
            return false
          }
        }
      ),
    },
  },
}
