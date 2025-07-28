const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
    {
        name: { 
            type: String, 
            required: [true, "Name is required"],
            trim: true,
            minlength: [2, "Name must be at least 2 characters"],
            maxlength: [50, "Name cannot exceed 50 characters"]
        },
        email: { 
            type: String, 
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"]
        },
        password: { 
            type: String, 
            required: [true, "Password is required"],
            minlength: [6, "Password must be at least 6 characters"]
        },
        profileImageUrl: { 
            type: String, 
            default: null,
            validate: {
                validator: function(v) {
                    if (!v) return true; // Allow null/empty
                    return /^https?:\/\/.+/.test(v) || /^data:image\/.+/.test(v);
                },
                message: "Profile image must be a valid URL or data URI"
            }
        },
        role: { 
            type: String, 
            enum: {
                values: ["admin", "member"],
                message: "Role must be either 'admin' or 'member'"
            },
            default: "member"
        },
        isActive: {
            type: Boolean,
            default: true
        },
        lastLogin: {
            type: Date,
            default: null
        }
    },
    { 
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Index for better query performance
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });

// Virtual for user's full name
UserSchema.virtual('fullName').get(function() {
    return this.name;
});

// Method to get public profile (without password)
UserSchema.methods.toPublicJSON = function() {
    const user = this.toObject();
    delete user.password;
    return user;
};

// Pre-save middleware to ensure email is lowercase
UserSchema.pre('save', function(next) {
    if (this.isModified('email')) {
        this.email = this.email.toLowerCase();
    }
    next();
});

module.exports = mongoose.model("User", UserSchema); 