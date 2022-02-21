const { model, Schema } = require('mongoose')

const customerSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'users',
  },
  personal: {
    type: String,
    default: '',
  },
  position: {
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
  isShared: {
    type: Boolean,
    default: false,
  },
})

module.exports = model('Customer', customerSchema)
