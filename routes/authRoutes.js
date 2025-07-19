const express=require("express");
const { registerUser, loginUser, getUserProfile, updateUserProfile } = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

const router=express.Router();//Creates a modular, mini version of your app to handle a group of routes.

router.post("/register",registerUser) //Ragister User
router.post("/login",loginUser) // login User

router.get("/profile",protect,getUserProfile) //get User Profile

router.put("/profile",protect,updateUserProfile) // Upate profile


router.post("/upload-image",upload.single("image"),(req,res)=>{
    if(!req.file){
        return res.status(400).json({message:"no file uploaded"})
    }

    const imageUrl=`${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    res.status(200).json({imageUrl})
})

module.exports=router;