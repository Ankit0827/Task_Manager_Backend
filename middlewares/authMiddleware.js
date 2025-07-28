const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware to protect routes
const protect = async (req, res, next) => {
    let token;
    
    try {
        // Check for token in headers
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }

        // Check for token in cookies (alternative)
        if (!token && req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: "Access denied. No token provided." 
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if user still exists
        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: "Token is valid but user no longer exists." 
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({ 
                success: false,
                message: "User account is deactivated." 
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        req.user = user;
        next();
        
    } catch (error) {
        console.error("Auth middleware error:", error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                message: "Invalid token." 
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                message: "Token has expired." 
            });
        }
        
        return res.status(500).json({ 
            success: false,
            message: "Authentication error." 
        });
    }
};

// Middleware for Admin-only access 
const adminOnly = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            success: false,
            message: "Authentication required." 
        });
    }
    
    if (req.user.role === "admin") {
        next();
    } else {
        return res.status(403).json({ 
            success: false,
            message: "Access denied. Admin privileges required." 
        });
    }
};

// Middleware for Member-only access
const memberOnly = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            success: false,
            message: "Authentication required." 
        });
    }
    
    if (req.user.role === "member") {
        next();
    } else {
        return res.status(403).json({ 
            success: false,
            message: "Access denied. Member privileges required." 
        });
    }
};

// Middleware to check if user owns the resource or is admin
const authorizeResource = (resourceUserIdField = 'createdBy') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false,
                message: "Authentication required." 
            });
        }

        const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
        
        if (req.user.role === "admin" || req.user._id.toString() === resourceUserId) {
            next();
        } else {
            return res.status(403).json({ 
                success: false,
                message: "Access denied. You can only access your own resources." 
            });
        }
    };
};

// Optional authentication middleware
const optionalAuth = async (req, res, next) => {
    let token;
    
    try {
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token && req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select("-password");
            if (user && user.isActive) {
                req.user = user;
            }
        }
        
        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
};

module.exports = {
    protect,
    adminOnly,
    memberOnly,
    authorizeResource,
    optionalAuth
};

