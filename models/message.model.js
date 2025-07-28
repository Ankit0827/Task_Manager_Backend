
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Fixed reference to match User model
      required: [true, "Sender ID is required"],
      index: true
    },
    receiverId: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Fixed reference to match User model
      required: [true, "Receiver ID is required"],
      index: true
    },
    text: {
      type: String,
      trim: true,
      maxlength: [1000, "Message text cannot exceed 1000 characters"]
    },
    image: {
      type: String,
      validate: {
        validator: function(v) {
          if (!v) return true; // Allow empty/null
          return /^https?:\/\/.+/.test(v) || /^data:image\/.+/.test(v);
        },
        message: "Image must be a valid URL or data URI"
      }
    },
    seen: { 
      type: Boolean,
      default: false,
      index: true
    },
    messageType: {
      type: String,
      enum: {
        values: ["text", "image", "file"],
        message: "Message type must be text, image, or file"
      },
      default: "text"
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
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

// Compound index for efficient message queries
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, seen: 1 });
messageSchema.index({ createdAt: -1 });

// Virtual for message content (text or image)
messageSchema.virtual('content').get(function() {
  return this.text || this.image || '';
});

// Virtual for message age
messageSchema.virtual('age').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffTime = now - created;
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
});

// Method to mark message as seen
messageSchema.methods.markAsSeen = function() {
  this.seen = true;
  return this.save();
};

// Method to soft delete message
messageSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Static method to get conversation between two users
messageSchema.statics.getConversation = function(userId1, userId2, limit = 50, skip = 0) {
  return this.find({
    $or: [
      { senderId: userId1, receiverId: userId2 },
      { senderId: userId2, receiverId: userId1 }
    ],
    isDeleted: false
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip)
  .populate('senderId', 'name profileImageUrl')
  .populate('receiverId', 'name profileImageUrl');
};

// Static method to get unread message count
messageSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    receiverId: userId,
    seen: false,
    isDeleted: false
  });
};

// Pre-save middleware to set message type
messageSchema.pre('save', function(next) {
  if (this.isModified('text') || this.isModified('image')) {
    if (this.image && !this.text) {
      this.messageType = 'image';
    } else if (this.text && !this.image) {
      this.messageType = 'text';
    }
  }
  next();
});

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
