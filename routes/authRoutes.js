const express = require("express");
const { 
    registerUser, 
    loginUser, 
    getUserProfile, 
    updateUserProfile, 
    logoutUser 
} = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");
const { uploadProfileImage, handleUploadError } = require("../middlewares/uploadMiddleware");

const router = express.Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected routes
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.post("/logout", protect, logoutUser);

// Image upload route with error handling
router.post("/upload-image", 
    protect, 
    uploadProfileImage, 
    (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "No file uploaded"
                });
            }

            const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
            
            res.status(200).json({
                success: true,
                message: "Image uploaded successfully",
                data: {
                    imageUrl,
                    filename: req.file.filename,
                    size: req.file.size,
                    mimetype: req.file.mimetype
                }
            });
        } catch (error) {
            console.error("Image upload error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to upload image"
            });
        }
    },
    handleUploadError
);

module.exports = router;