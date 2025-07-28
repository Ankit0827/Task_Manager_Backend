const mongoose = require("mongoose");

// Todo item schema for task checklists
const todoSchema = new mongoose.Schema({
    text: { 
        type: String, 
        required: [true, "Todo text is required"],
        trim: true,
        minlength: [1, "Todo text cannot be empty"]
    },
    completed: { 
        type: Boolean, 
        default: false 
    },
    completedAt: {
        type: Date,
        default: null
    }
}, { _id: true });

// Task schema with improved validation and features
const taskSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, "Task title is required"],
        trim: true,
        minlength: [3, "Task title must be at least 3 characters"],
        maxlength: [100, "Task title cannot exceed 100 characters"]
    },
    description: { 
        type: String,
        trim: true,
        maxlength: [1000, "Description cannot exceed 1000 characters"]
    },
    priority: {
        type: String,
        enum: {
            values: ["Low", "Medium", "High"],
            message: "Priority must be Low, Medium, or High"
        },
        default: "Medium",
    },
    status: {
        type: String,
        enum: {
            values: ["Pending", "In progress", "Completed", "Cancelled"],
            message: "Status must be Pending, In progress, Completed, or Cancelled"
        },
        default: "Pending",
    },
    dueDate: { 
        type: Date, 
        required: [true, "Due date is required"],
        validate: {
            validator: function(v) {
                return v > new Date();
            },
            message: "Due date must be in the future"
        }
    },
    assignedTo: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User",
        validate: {
            validator: function(v) {
                return v && v.length > 0;
            },
            message: "At least one user must be assigned"
        }
    }],
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User",
        required: [true, "Task creator is required"]
    },
    attachments: [{ 
        type: String,
        validate: {
            validator: function(v) {
                if (!v) return true;
                return /^https?:\/\/.+/.test(v) || /^data:.+/.test(v);
            },
            message: "Attachment must be a valid URL or data URI"
        }
    }],
    todoChecklist: [todoSchema],
    progress: { 
        type: Number, 
        default: 0,
        min: [0, "Progress cannot be negative"],
        max: [100, "Progress cannot exceed 100%"]
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    estimatedHours: {
        type: Number,
        min: [0, "Estimated hours cannot be negative"]
    },
    actualHours: {
        type: Number,
        min: [0, "Actual hours cannot be negative"]
    },
    isArchived: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ isArchived: 1 });
taskSchema.index({ createdAt: -1 });

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
    return this.dueDate < new Date() && this.status !== 'Completed';
});

// Virtual for days remaining
taskSchema.virtual('daysRemaining').get(function() {
    const now = new Date();
    const due = new Date(this.dueDate);
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

// Method to calculate progress based on completed todos
taskSchema.methods.calculateProgress = function() {
    if (!this.todoChecklist || this.todoChecklist.length === 0) {
        return this.progress;
    }
    
    const completedTodos = this.todoChecklist.filter(todo => todo.completed).length;
    const totalTodos = this.todoChecklist.length;
    return Math.round((completedTodos / totalTodos) * 100);
};

// Pre-save middleware to update progress
taskSchema.pre('save', function(next) {
    if (this.isModified('todoChecklist')) {
        this.progress = this.calculateProgress();
    }
    next();
});

// Static method to get tasks by status
taskSchema.statics.findByStatus = function(status) {
    return this.find({ status, isArchived: false });
};

// Static method to get overdue tasks
taskSchema.statics.findOverdue = function() {
    return this.find({
        dueDate: { $lt: new Date() },
        status: { $ne: 'Completed' },
        isArchived: false
    });
};

module.exports = mongoose.model("Task", taskSchema);
