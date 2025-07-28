const Task = require("../models/Task");
const User = require("../models/User");

// @desc get All user by Admin Only
// @route GET /api/users/
// @access private (Admin)
const getUsers = async (req, res) => {
    try {
        const users = await User.find({ role: "member" }).select("-password");

        // Add Task count to each user
        const userWithTaskCounts = await Promise.all(users.map(async (user) => {
            const PendingTask = await Task.countDocuments({ assignedTo: user._id, status: "Pending" });
            const inProgressTask = await Task.countDocuments({ assignedTo: user._id, status: "In progress" });
            const completedTask = await Task.countDocuments({ assignedTo: user._id, status: "Completed" });

            return {
                ...user._doc,
                PendingTask,
                inProgressTask,
                completedTask
            };
        }));

        res.json(userWithTaskCounts);

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc get User By Id 
// @route GET /api/users/:id
// @access private
const getUsersById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc Update user role by admin only
// @route PUT /api/users/:id/role
// @access private(Admin)
const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        const { id } = req.params;

        // Validate role
        if (!["admin", "member"].includes(role)) {
            return res.status(400).json({ message: "Role must be either 'admin' or 'member'" });
        }

        // Check if user exists
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Prevent admin from demoting themselves
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: "You cannot change your own role" });
        }

        // Update user role
        user.role = role;
        await user.save();

        res.json({ 
            message: "User role updated successfully", 
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc Delete a user by admin only with task reassignment
// @route DELETE /api/users/:id
// @access private(Admin)
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { reassignTo } = req.body; // Optional: ID of user to reassign tasks to

        // Check if user exists
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Prevent admin from deleting themselves
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: "You cannot delete your own account" });
        }

        // Find all tasks assigned to this user
        const assignedTasks = await Task.find({ assignedTo: user._id });

        if (assignedTasks.length > 0) {
            if (reassignTo) {
                // Reassign tasks to specified user
                const reassignUser = await User.findById(reassignTo);
                if (!reassignUser) {
                    return res.status(404).json({ message: "Reassignment user not found" });
                }

                // Update all tasks assigned to the deleted user
                await Task.updateMany(
                    { assignedTo: user._id },
                    { 
                        $pull: { assignedTo: user._id },
                        $addToSet: { assignedTo: reassignUser._id }
                    }
                );

                res.json({ 
                    message: `User deleted successfully. ${assignedTasks.length} tasks reassigned to ${reassignUser.name}`,
                    reassignedTasks: assignedTasks.length
                });
            } else {
                // Remove user from all assigned tasks
                await Task.updateMany(
                    { assignedTo: user._id },
                    { $pull: { assignedTo: user._id } }
                );

                res.json({ 
                    message: `User deleted successfully. User removed from ${assignedTasks.length} tasks`,
                    removedFromTasks: assignedTasks.length
                });
            }
        } else {
            res.json({ message: "User deleted successfully. No tasks were assigned to this user." });
        }

        // Delete the user
        await user.deleteOne();

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc Get all users except the current logged-in user (for chat)
// @route GET /api/users/all-users
// @access private
const getAllUsersExceptCurrent = async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.user._id } }).select("-password");
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc Get all users for task reassignment (admin only)
// @route GET /api/users/reassignment-options
// @access private(Admin)
const getReassignmentOptions = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Get all users except the one being deleted
        const users = await User.find({ 
            _id: { $ne: userId },
            role: "member" // Only show members for reassignment
        }).select("name email role");

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {
    getUsers,
    getUsersById,
    deleteUser,
    getAllUsersExceptCurrent,
    updateUserRole,
    getReassignmentOptions
};
