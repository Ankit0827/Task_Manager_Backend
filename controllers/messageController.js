const mongoose = require("mongoose");
const Message = require("../models/message.model");
const User = require("../models/User");
const { encrypt, decrypt } = require("../utils/encryption");

// Get all users for the sidebar except current user
const getUserForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUserForSidebar:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get messages between current user and selected user
const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const currentUserId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: currentUserId },
      ],
    }).sort({ createdAt: 1 }); // Sort by createdAt in ascending order (oldest first)

    const decryptedMessages = messages.map((msg) => ({
      ...msg.toObject(),
      text: decrypt(msg.text),
    }));

    res.status(200).json(decryptedMessages);
  } catch (error) {
    console.error("Error in getMessages:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Send a new message
const sendMessages = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    const encryptedText = encrypt(text);

    const newMessage = new Message({
      senderId,
      receiverId,
      text: encryptedText,
      image,
      // seen defaults to false
    });

    await newMessage.save();

    res.status(201).json({
      ...newMessage.toObject(),
      text, // return decrypted text
    });
  } catch (error) {
    console.error("Error in sendMessages:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get unseen message counts per sender
const getNewMessageCount = async (req, res) => {
  const { userId: receiverId } = req.params;

  try {
    const unseenCounts = await Message.aggregate([
      {
        $match: {
          receiverId:mongoose.Types.ObjectId.createFromHexString(receiverId),
          seen: false,
        },
      },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json(unseenCounts);
  } catch (error) {
    console.error("Error in getNewMessageCount:", error.message);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUserForSidebar,
  getMessages,
  sendMessages,
  getNewMessageCount,
};
