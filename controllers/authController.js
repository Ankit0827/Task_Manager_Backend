const User =require("../models/User")
require('dotenv').config();
const bcrypt=require("bcryptjs")
const jwt=require("jsonwebtoken")


//  Generate JWT Token

const generateToken=(UserID)=>{
    return jwt.sign({id:UserID},process.env.JWT_SECRET,{expiresIn:"7d"})

}

// @desc Ragister a new user
// @route POST /api/auth/register
// @access Public
const registerUser = async (req, res) => {
    try {
        const { name, email, password, profileImageUrl, adminInviteToken } = req.body;
        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }
        // Determine role
        let role = "member";
        if (adminInviteToken && adminInviteToken === process.env.ADMIN_INVITE_TOKEN) {
            role = "admin";
        }
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            name,
            email,
            password: hashPassword,
            profileImageUrl,
            role
        });

        // Send response
        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            profileImageUrl: user.profileImageUrl,
            token: generateToken(user._id)
        });
    } catch (error) {
        console.error("Registration error:", error); 
        res.status(500).json({ message: "Server error", error: error.message });
    }
};



// @desc LoginUser
// @route POST /api/auth/login
// @acces Public
const loginUser=async(req,res)=>{
       try {
        const {email,password}=req.body
        const user=await User.findOne({email});

        if(!user){
            return res.status(401).json({message:"Invalid email or password"})
        }

        // compare password
        const isMatch=await bcrypt.compare(password,user.password);
        if(!isMatch){
            return res.status(401).json({message:"Invalid email or password"})
        }


        // return data with jwt 
        res.json({
            _id:user._id,
            name:user.name,
            email:user.email,
            role:user.role,
            profileImageUrl:user.profileImageUrl,
            token:generateToken(user._id)
        });
    } catch (error) {
        res.status(500).json({message:"Server error",error:error.message})
        
    }
}

// @desc Get user Profile
// @route GET /api/profile
// @access Private(required JWT)

const getUserProfile= async(req,res)=>{
       try {
        const user= await User.findById(req.user.id).select("-password")
        console.log(user.id)

        if(!user){
            return res.status(404).json({message:"User not found"})
        }

        res.json(user)
        
    } catch (error) {
        res.status(500).json({message:"Server error",error:error.message})
        
    }
}


// @desc Get user Profile
// @route PUT /api/profile
// @access Private(required JWT)

const updateUserProfile=async(req,res)=>{
       try {

         const user= await User.findById(req.user.id)
      
        if(!user){
            return res.status(404).json({message:"User not found"})
        }

       user.name = req.body.name || user.name
       user.email=req.body.email || user.email


       if(req.body.password){
        const salt=await bcrypt.genSalt(10);
        user.password=await bcrypt.hash(req.body.password,salt)
       }

       const updateUser= await user.save();

         res.json({
            _id:updateUser._id,
            name:updateUser.name,
            email:updateUser.email,
            role:updateUser.role,
            token:generateToken(updateUser._id)
        });

        
    } catch (error) {
        res.status(500).json({message:"Server error",error:error.message})
        
    }
}


module.exports={registerUser,loginUser,getUserProfile,updateUserProfile}