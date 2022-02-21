const jwtDecode = require('jwt-decode')
const cors = require('cors')
const dotenv = require('dotenv')
const express = require('express')
const mongoose = require('mongoose')
const { createServer } = require('http')
const { execute, subscribe } = require('graphql')
const { ApolloServer } = require('apollo-server-express')
const {
  ApolloServerPluginLandingPageGraphQLPlayground,
} = require('apollo-server-core')
const { makeExecutableSchema } = require('@graphql-tools/schema')
const { SubscriptionServer } = require('subscriptions-transport-ws')

// graphql
const typeDefs = require('./graphql/typeDefs.js')
const resolvers = require('./graphql/resolver')
//const { MONGODB } = require('./config.js')

dotenv.config()
;(async function () {
  const port = process.env.PORT || 4040

  const app = express()

  const corsOptions = {
    origin: '*',
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }
  app.use(cors(corsOptions))

  const httpServer = createServer(app)

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  })

  const subscriptionServer = SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,
      onConnect: (connectionParams, webSocket, context) => {
        const {
          headers: { Authorization },
        } = connectionParams
        const parts = Authorization.split(' ')
        const credential = parts[1]

        if (credential) {
          const subscribeUser = jwtDecode(credential)
          return {
            user: subscribeUser,
          }
        }

        throw new Error('Missing auth token!')
      },
      onOperation: (_, params) => {
        return {
          ...params,
          context: {
            ...params.context,
          },
        }
      },
    },
    { server: httpServer, path: '/graphql' }
  )

  const server = new ApolloServer({
    cors: false,
    schema,
    plugins: [
      ApolloServerPluginLandingPageGraphQLPlayground(),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              subscriptionServer.close()
            },
          }
        },
      },
    ],
    context: ({ req }) => ({ req, user: req.user }),
  })

  await server.start().then(() => {
    server.applyMiddleware({ app, cors: false })
  })

  const localMongoDB = 'mongodb://localhost:27017/'
  // live mongoDb => process.env.MONGO_URL

  mongoose
    .connect(localMongoDB, {
      dbName: 'unshift-scheduler',
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .catch((err) => {
      console.log(err)
    })

  httpServer.listen(port, () => console.log(`Server Running On Port: ${port}`))
})()
