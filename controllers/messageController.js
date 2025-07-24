const Message = require("../models/message.model");
const User = require("../models/User");

const getUserForSidebar = async (req, res) => {
  try {
const loggedInUserId = req.user._id;

    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUserForSidebar", error);
    res.status(500).json({ error: "Internal Server error" });
  }
};


const getMessages = async (req, res) => {
    try {
        const { id: userTochatId } = req.params;
        const MyId = req.user._id;
        const messages = await Message.find({
            $or: [
                { senderId: MyId, rceiverId: userTochatId },
                { senderId: userTochatId, rceiverId: MyId }
            ]
        })

        res.status(200).json(messages)
    } catch (error) {
        console.log("Error in getMessage Controller", error.message);
        res.status(500).json({ error: "Internal Server error" });

    }

}


const sendMessages = async (req, res) => {
    try {
          const { text, image } = req.body;
    const { id: rceiverId } = req.params;
    const senderId = req.user._id;
    const newMessages = new Message({
        senderId,
        rceiverId,
        text,
        image,
    })

    await newMessages.save();
    res.status(201).json(newMessages);
        
    } catch (error) {
         console.log("Error in sendMessage Controller", error.message);
        res.status(500).json({ error: "Internal Server error" });
    }
  
}
module.exports = { getUserForSidebar, getMessages, sendMessages }