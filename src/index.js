// require('doenv').config({path:'./env'})
import dotenv from "dotenv"
import connectDB from "./db/db.js";
import { app } from "./app.js";

dotenv.config({
  path: "./.env",
})
connectDB()
.then(()=>{
  app.on("error",(error)=>{
        console.log("Error",error);
        throw error;
       })
  app.listen(process.env.port || 8000,()=>{
    console.log(`server is running at port ${process.env.port}`)
  })
}).catch((err)=>{
console.log("MongoDb connection failed !!!",err)
})




















// (async()=>{
//   try {
//    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//    app.on("error",(error)=>{
//     console.log("Error",error);
//     throw error;
//    })
//    app.listen(process.env.PORT,()=>{
//     console.log(`Server is running on port ${process.env.PORT}`);
//    })
//   } catch (error) {
//     console.log("ERROR: ",error)
//   }
// })()