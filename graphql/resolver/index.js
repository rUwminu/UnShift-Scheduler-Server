const userResolvers = require('./userResolver')
const eventResolvers = require('./eventResolver')

module.exports = {
  Query: {
    ...userResolvers.Query,
    ...eventResolvers.Query,
  },
  Mutation: {
    ...userResolvers.Mutation,
    ...eventResolvers.Mutation,
  },
}
