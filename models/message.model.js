const mongoose = require("mongoose");

const messageScheema=new mongoose.Schema(
    {
        senderId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"users",
            required:true,
        },
         rceiverId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"users",
            required:true,
        },
        text:{
            type:String,
        },
        image:{
            type:String,
        }
    },
    {timestamps:true}
)

const Message=mongoose.model("Message",messageScheema);
module.exports=Message;