const { model, Schema } = require('mongoose')

const eventSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'users',
    },
    title: String,
    description: String,
    planDate: String,
    compDate: String,
    isCompleted: Boolean,
    isRescheduled: Boolean,
    isCancelled: Boolean,
  },
  { timestamps: true }
)

module.exports = model('Event', eventSchema)
