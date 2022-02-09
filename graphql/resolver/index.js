const userResolvers = require('./userResolver')
const customerResolver = require('./customerResolver')
const eventResolvers = require('./eventResolver')

module.exports = {
  Query: {
    ...userResolvers.Query,
    ...customerResolver.Query,
    ...eventResolvers.Query,
  },
  Mutation: {
    ...userResolvers.Mutation,
    ...customerResolver.Mutation,
    ...eventResolvers.Mutation,
  },
  Subscription: {
    ...eventResolvers.Subscription,
  },
}
