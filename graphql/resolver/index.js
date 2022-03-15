const userResolvers = require('./userResolver')
const customerResolver = require('./customerResolver')
const eventResolvers = require('./eventResolver')
const { GraphQLDateTime } = require('graphql-iso-date')

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
    ...customerResolver.Subscription,
  },
  ISODate: GraphQLDateTime,
}
