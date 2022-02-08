const { model, Schema } = require('mongoose')

const customerSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'users',
  },
  fullname: {
    type: String,
    default: '',
  },
  company: {
    type: String,
    default: '',
  },
  personalcontact: {
    type: String,
    default: '',
  },
  companycontact: {
    type: String,
    default: '',
  },
  address: {
    type: String,
    default: '',
  },
})

module.exports = model('Customer', customerSchema)
