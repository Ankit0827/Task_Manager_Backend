const mongoose = require("mongoose");

// This schema is used to create, store, and manage to-do items in your MongoDB collection using Mongoose.

const todoSchema = new mongoose.Schema({
    text: { type: String, required: true },
    completed: { type: Boolean, default: false },
});

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    priority: {
        type: String,
        enum: ["Low", "Medium", "High"],
        default: "Medium",
    },
    status: {
        type: String,
        enum: ["Pending", "In progress", "Completed"],
        default: "Pending",
    },
    dueDate: { type: Date, required: true },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    attachments: [{ type: String }],
    todoChecklist: [todoSchema],
    progress: { type: Number, default: 0 }
},
{timestamps:true}
);

module.exports=mongoose.model("Task",taskSchema)
