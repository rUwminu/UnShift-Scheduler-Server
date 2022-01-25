const { ApolloServer } = require('apollo-server-express')
const {
  ApolloServerPluginLandingPageGraphQLPlayground,
} = require('apollo-server-core')
const mongoose = require('mongoose')
const cors = require('cors')
const express = require('express')
const dotenv = require('dotenv')
const typeDefs = require('./graphql/typeDefs.js')
const resolvers = require('./graphql/resolver')
//const { MONGODB } = require('./config.js')

dotenv.config()

const port = process.env.PORT || 4000

const app = express()

const corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204,
}
app.use(cors(corsOptions))

const server = new ApolloServer({
  cors: false,
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
  context: ({ req }) => ({ req }),
})

server.start().then(() => {
  server.applyMiddleware({ app, cors: false })
  app.listen(port)
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
