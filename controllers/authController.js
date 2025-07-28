const User = require("../models/User");
require('dotenv').config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Generate JWT Token with better configuration
const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { 
            expiresIn: process.env.JWT_EXPIRES_IN || "7d",
            issuer: 'taskmanager-api',
            audience: 'taskmanager-client'
        }
    );
};

// @desc Register a new user
// @route POST /api/auth/register
// @access Public
const registerUser = async (req, res) => {
    try {
        const { name, email, password, profileImageUrl, adminInviteToken } = req.body;

        // Input validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required"
            });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address"
            });
        }

        // Password strength validation
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long"
            });
        }

        // Check if user already exists
        const userExists = await User.findOne({ email: email.toLowerCase() });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: "User with this email already exists"
            });
        }

        // Determine role based on admin invite token
        let role = "member";
        if (adminInviteToken && adminInviteToken === process.env.ADMIN_INVITE_TOKEN) {
            role = "admin";
        }

        // Hash password with better salt rounds
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const hashPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashPassword,
            profileImageUrl,
            role
        });

        // Generate token
        const token = generateToken(user._id);

        // Send response without password
        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profileImageUrl: user.profileImageUrl,
                token
            }
        });
    } catch (error) {
        console.error("Registration error:", error);
        
        // Handle mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: messages
            });
        }

        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "User with this email already exists"
            });
        }

        res.status(500).json({
            success: false,
            message: "Server error during registration"
        });
    }
};

// @desc Login user
// @route POST /api/auth/login
// @access Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Input validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // Find user by email (case insensitive)
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: "Account is deactivated. Please contact administrator."
            });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        // Return user data with token
        res.json({
            success: true,
            message: "Login successful",
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profileImageUrl: user.profileImageUrl,
                lastLogin: user.lastLogin,
                token
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during login"
        });
    }
};

// @desc Get user profile
// @route GET /api/auth/profile
// @access Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching profile"
        });
    }
};

// @desc Update user profile
// @route PUT /api/auth/profile
// @access Private
const updateUserProfile = async (req, res) => {
    try {
        const { name, email, password, profileImageUrl } = req.body;

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Update fields if provided
        if (name) user.name = name.trim();
        if (email) {
            // Check if email is already taken by another user
            const existingUser = await User.findOne({ 
                email: email.toLowerCase(),
                _id: { $ne: user._id }
            });
            
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: "Email is already taken by another user"
                });
            }
            
            user.email = email.toLowerCase().trim();
        }
        if (profileImageUrl) user.profileImageUrl = profileImageUrl;

        // Update password if provided
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: "Password must be at least 6 characters long"
                });
            }
            
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
            user.password = await bcrypt.hash(password, saltRounds);
        }

        const updatedUser = await user.save();

        // Generate new token
        const token = generateToken(updatedUser._id);

        res.json({
            success: true,
            message: "Profile updated successfully",
            data: {
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                profileImageUrl: updatedUser.profileImageUrl,
                token
            }
        });
    } catch (error) {
        console.error("Update profile error:", error);
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: messages
            });
        }

        res.status(500).json({
            success: false,
            message: "Server error while updating profile"
        });
    }
};

// @desc Logout user (optional - for token invalidation)
// @route POST /api/auth/logout
// @access Private
const logoutUser = async (req, res) => {
    try {
        // In a real application, you might want to add the token to a blacklist
        // For now, we'll just return a success message
        res.json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during logout"
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    logoutUser
};