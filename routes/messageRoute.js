const { getUserForSidebar, getMessages, sendMessages ,getNewMessageCount}=require("../controllers/messageController");
const { protect }= require("../middlewares/authMiddleware");

const express=require("express");
const upload = require("../middlewares/uploadMiddleware");

const router=express.Router();

router.get("/users",protect,getUserForSidebar);
router.get("/:id",protect,getMessages);
router.get("/unseen-count/:userId",protect,getNewMessageCount);
router.post("/send/:id",protect,sendMessages);


module.exports =router