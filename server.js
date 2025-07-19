require("dotenv").config();
const express =require("express");
const cors =require("cors");
const connectDB = require("./config/db");
const authRoutes=require("./routes/authRoutes")
const userRoutes=require("./routes/userRoutes")
const taskRoutes=require("./routes/taskRoutes")
const reportRoutes=require("./routes/reportRoutes")
const path = require("path");




const app= express();

// Middleware to handle cors

app.use(cors({
    origin:process.env.CLIENT_URL || "*",
    methods:["GET","POST","PUT","DELETE"],
    allowedHeaders:["Content-type","Authorization"]
})
);

// Connect DataBase

connectDB()

// Middleware
app.use(express.json());

// Routes
app.use("/api/auth",authRoutes)
app.use("/api/users",userRoutes)
app.use("/api/tasks",taskRoutes)
app.use("/api/reports",reportRoutes)


// Serve uploads folder

app.use("/uploads",express.static(path.join(__dirname,"uploads")))






// Start server

const PORT=process.env.PORT || 5000;

app.listen(PORT,()=>console.log(`Server running on port  ${PORT}`))