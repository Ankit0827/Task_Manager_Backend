const Task = require("../models/Task")
const User = require("../models/User")


// @desc get All user by Admin Only
// @route GET /api/users/
// @access private (Admin)

const getUsers = async (req, res) => {
    try {
        const users = await User.find({ role: "member" }).select("-password")

        // AddTask count to each other
        const userWithTaskCounts = await Promise.all(users.map(async (user) => {
            const PendingTask = await Task.countDocuments({ assignedTo: user._id, status: "Pending" })
            const inProgressTask = await Task.countDocuments({ assignedTo: user._id, status: "In progress" })
            const completedTask = await Task.countDocuments({ assignedTo: user._id, status: "Completed" })

            return {
                ...user._doc, //   Include all existing Data
                PendingTask,
                inProgressTask,
                completedTask
            }
        }));

        res.json(userWithTaskCounts);

    } catch (error) {

        res.status(500).json({ message: "Server error ", error: error.message })

    }
}


// @desc get User By Id 
// @route GET /api/users/:id
// @access private
const getUsersById = async (req, res) => {
    try {
        const user =await User.findById(req.params.id).select("-password")
        if(!user){
            return res.status(404).json({message:"User not found"})
        }
        res.json(user);

    } catch (error) {

        res.status(500).json({ message: "Server error ", error: error.message })

    }
}



// @desc Delet a user by admin only
// @route DELETE /api/users/:id
// @access private(Admin)

const deleteUser = (req, res) => {
    try {

    } catch (error) {

        res.status(500).json({ message: "Server error ", error: error.message })

    }
}


module.exports = { getUsers, getUsersById, deleteUser }