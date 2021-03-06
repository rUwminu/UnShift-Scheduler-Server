const { model, Schema } = require('mongoose')

const eventSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'users',
    },
    title: {
      type: String,
      default: '',
    },
    customer: {
      cusId: {
        type: Schema.Types.ObjectId,
        ref: 'customers',
      },
    },
    description: {
      type: String,
      default: '',
    },
    planDate: {
      type: String,
      default: '',
    },
    compDate: {
      type: String,
      default: '',
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    isRescheduled: {
      type: Boolean,
      default: false,
    },
    isCancelled: {
      type: Boolean,
      default: false,
    },
    remark: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
)

module.exports = model('Event', eventSchema)
