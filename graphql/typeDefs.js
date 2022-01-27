const { gql } = require('apollo-server-express')

module.exports = gql`
  type User {
    id: ID!
    email: String!
    token: String!
    username: String!
    password: String!
    isManager: Boolean!
    createdAt: String!
  }
  input RegisterInput {
    username: String!
    password: String!
    confirmPassword: String!
    email: String!
    isManager: Boolean = false
  }
  type Event {
    id: ID!
    user: User!
    title: String!
    description: String!
    planDate: String!
    compDate: String!
    isCompleted: Boolean!
    isRescheduled: Boolean!
    isCancelled: Boolean!
  }
  input CreateEventInput {
    title: String!
    description: String
    planDate: String!
    compDate: String = ""
    isCompleted: Boolean = false
  }
  type Query {
    getUsers: [User]
    getUser(userId: ID!): User
    getAllEvent(month: Int!, year: Int!): [Event]
    getSelfEvent(month: Int!, year: Int!): [Event]
  }
  type Mutation {
    register(registerInput: RegisterInput): User!
    login(email: String!, password: String!): User!
    updateProfile(
      userId: ID!
      email: String
      username: String
      password: String
      confirmPassword: String
    ): User!
    deleteUser(userId: ID!): String!
    createNewEvent(createEventInput: CreateEventInput): Event!
    updateCompEvent(evtId: ID!): Event!
    updateRescEvent(evtId: ID!, planDate: String!): Event!
    updateCancelEvent(evtId: ID!): Event!
  }
  type Subscription {
    eventCreated: Event
    eventUpdated: Event
  }
`
