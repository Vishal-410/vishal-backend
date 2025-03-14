import mongoose from 'mongoose'
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"
const videoSchema = new mongoose.Schema({
  videoFile: {
    type: String,
    required: [true, "video is Required"]

  },
  thumbnail: {
    type: String,
    required: true

  },
  videoFile: {
    type: String,
    required: true

  },
  title: {
    type: String,
    required: true

  },
  description: {
    type: String,
    required: true

  },
  duration: {
    type: Number,
    required: true

  },
  views: {
    type: Number,
    default: 0

  },
  isPublished: {
    type: Boolean,
    default: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }

}, { timeseries: true })

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video", videoSchema)