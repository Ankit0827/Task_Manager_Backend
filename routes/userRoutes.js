const express =require("express");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const { getUsers, getUsersById, deleteUser, getAllUsersExceptCurrent } = require("../controllers/userController");


const router=express.Router();



// User management Routes

router.get("/", protect, adminOnly, getUsers); // Get all users (admin only)
router.get("/:id", protect, getUsersById);     // Get user by ID
router.delete("/:id", protect, adminOnly, deleteUser);
router.get("/all-users", protect, getAllUsersExceptCurrent); //  Delete user (admin only)



module.exports=router