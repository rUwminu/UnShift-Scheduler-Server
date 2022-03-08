const { gql } = require('apollo-server-express')

module.exports = gql`
  scalar ISODate

  type User {
    id: ID!
    email: String!
    token: String!
    username: String!
    password: String!
    isManager: Boolean!
    createdAt: ISODate!
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
    customer: CustomerInfo!
    description: String!
    planDate: String!
    compDate: String!
    isCompleted: Boolean!
    isRescheduled: Boolean!
    isCancelled: Boolean!
    remark: String!
  }
  type CustomerInfo {
    cusId: ID!
    personal: String!
    position: String!
    company: String!
  }
  input CustomerInfoInput {
    cusId: ID!
    personal: String!
    position: String!
    company: String!
  }
  input CreateEventInput {
    title: String!
    customer: CustomerInfoInput!
    description: String
    planDate: String!
    compDate: String = ""
    isCompleted: Boolean = false
  }
  type Customer {
    id: ID!
    personal: String!
    company: String!
    position: String!
    personalcontact: String!
    companycontact: String!
    address: String!
    isShared: Boolean!
  }
  input CreateCustomerInput {
    personal: String!
    company: String!
    position: String!
    personalcontact: String
    companycontact: String!
    address: String!
  }
  input UpdateCustomerInput {
    id: ID!
    personal: String = ""
    company: String = ""
    position: String = ""
    personalcontact: String = ""
    companycontact: String = ""
    address: String = ""
  }
  type Query {
    getUsers: [User]
    getUser(userId: ID!): User
    getSelfCustomers: [Customer]
    getAllEvent(startDate: String!, endDate: String!): [Event]
    getSelfEvent(startDate: String!, endDate: String!): [Event]
    getSelfSelectedEvent(startDate: String, endDate: String): [Event]
    getAllSelectedEvent(startDate: String, endDate: String): [Event]
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
    createNewCustomer(createCustomerInput: CreateCustomerInput): Customer!
    updateExistCustomer(updateCustomerInput: UpdateCustomerInput): Customer!
    deleteExistCustomer(cusId: ID!): Customer!
    createNewEvent(createEventInput: CreateEventInput): Event!
    updateCompEvent(evtId: ID!): Event!
    updateForeEvent(evtId: ID!): Event!
    updateRescEvent(evtId: ID!, planDate: String!): Event!
    updateCancelEvent(evtId: ID!, remark: String!): Event!
    deleteEvent(evtId: ID!): String!
  }
  type Subscription {
    eventCreated: Event
    eventUpdated: Event
    eventDeleted: Event
  }
`
