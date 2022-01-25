const { AuthenticationError } = require('apollo-server-express')

const jwt = require('jsonwebtoken')
const { SECRET_KEY } = require('../config')

module.exports = (context) => {
  const authHeader = context.req.headers.authorization

  if (authHeader) {
    // Beare ....
    const token = authHeader.split('Bearer ')[1]
    if (token) {
      try {
        const user = jwt.verify(token, SECRET_KEY)
        return user
      } catch (err) {
        throw new AuthenticationError(err)
      }
    }
    throw new Error('Authentication token invalid')
  }
  throw new Error('Authentication header must provided')
}
