// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const connectDB = require("./config/db");
// const authRoutes = require("./routes/authRoutes")
// const userRoutes = require("./routes/userRoutes")
// const taskRoutes = require("./routes/taskRoutes")
// const reportRoutes = require("./routes/reportRoutes")
// const messageRoute = require("./routes/messageRoute")

// const path = require("path");

// const app = express();

// // Middleware to handle cors
// app.use(cors({
//     origin: process.env.CLIENT_URL || "*",
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     allowedHeaders: ["Content-type", "Authorization"]
// })
// );

// // Connect DataBase
// connectDB()

// // Middleware
// app.use(express.json());

// // Routes
// app.use("/api/auth", authRoutes)
// app.use("/api/users", userRoutes)
// app.use("/api/tasks", taskRoutes)
// app.use("/api/reports", reportRoutes)

// // Serve uploads folder
// app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// // for meesage  
// app.use("/api/message", messageRoute)

// // Start server

// const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => console.log(`Server running on port  ${PORT}`))

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const taskRoutes = require("./routes/taskRoutes");
const reportRoutes = require("./routes/reportRoutes");
const messageRoute = require("./routes/messageRoute");
const path = require("path");
const Message = require("./models/message.model");

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    credentials: true
  }
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("sendMessage", (data) => {
    io.emit("receiveMessage", data);
  });

  socket.on("userOnline", (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit("updateOnlineUsers", Array.from(onlineUsers.keys()));
  });

  socket.on("messageSeen", async ({ messageId, senderId }) => {
    try {
      await Message.findByIdAndUpdate(messageId, { seen: true });

      const receiverSocketId = onlineUsers.get(senderId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageSeenAck", { messageId });
      }
    } catch (error) {
      console.error("Error marking message as seen:", error.message);
    }
  });

  socket.on("disconnect", () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    io.emit("updateOnlineUsers", Array.from(onlineUsers.keys()));
    console.log("User disconnected:", socket.id);
  });
});


// Connect DB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-type", "Authorization"]
}));

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/message", messageRoute);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

