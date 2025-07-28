const express =require("express");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const { 
    getUsers, 
    getUsersById, 
    deleteUser, 
    getAllUsersExceptCurrent,
    updateUserRole,
    getReassignmentOptions
} = require("../controllers/userController");

const router=express.Router();

// User management Routes
router.get("/", protect, adminOnly, getUsers); // Get all users (admin only)
router.get("/:id", protect, getUsersById);     // Get user by ID
router.delete("/:id", protect, adminOnly, deleteUser); // Delete user (admin only)
router.get("/all-users", protect, getAllUsersExceptCurrent); // Get all users except current

// New user management routes
router.put("/:id/role", protect, adminOnly, updateUserRole); // Update user role (admin only)
router.get("/reassignment-options/:userId", protect, adminOnly, getReassignmentOptions); // Get reassignment options

module.exports=router