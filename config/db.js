const mongoose=require("mongoose");

const connectDB=async()=>{
    try{
        await mongoose.connect(process.env.MONGO_URL,{})
        console.log("Mongodb connect succesfully...")
    }catch(err){
           console.log("connection failed",err);
           process.exit(1)
    }
}
module.exports=connectDB