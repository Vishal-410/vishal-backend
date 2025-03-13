import mongoose from "mongoose";

import express from "express";
import { DB_NAME } from "../constant.js";
const app = express();

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
    console.log(`\n MongoDB Connected !! DB Host: ${connectionInstance.connection.host}`)
    // app.listen(process.env.PORT, () => {
    //   console.log(`Server is running on port ${process.env.PORT}`);
    // })
  } catch (error) {
    console.log("MongoDb Connection Failed: ", error)
    process.exit(1)
  }
}

export default connectDB