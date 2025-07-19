const Task = require("../models/Task")



//@desc Create New task
//@route GET /api/tasks/
// @access private(Admin)

const createTask = async (req, res) => {
    try {
        const { title, description, priority, dueDate, assignedTo, attachments, todoChecklist } = req.body

        if (!Array.isArray(assignedTo)) {
            return res.status(400).json({ message: "assignedTo must be an array of User IDs" })
        }

        const task = await Task.create({
            title,
            description,
            priority,
            dueDate,
            assignedTo,
            createdBy: req.user._id,
            todoChecklist,
            attachments
        })

        res.status(201).json({ message: "Task Created successfully ", task });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message })
    }
}




//@desc get All task (Admin :all assigned users)
//@route GET /api/tasks/
// @access private

const getTask = async (req, res) => {

    try {
        const { status } = req.query;
        let filter = {};

        if (status) {
            filter.status = status
        }
        let tasks;
        if (req.user.role === "admin") {
            tasks = await Task.find(filter).populate("assignedTo", "name email profileImageUrl")
        } else {
            tasks = await Task.find({ ...filter, assignedTo: req.user._id }).populate("assignedTo", "name email profileImageUrl")
        }


        // Add Completed todoChecklist count to each task
        tasks = await Promise.all(tasks.map(async (task) => {
            const CompletedCount = task.todoChecklist.filter((item) => item.completed).length;

            return { ...task._doc, CompletedTodoCount: CompletedCount }

        }))


        // status summary count 

        const allTasks = await Task.countDocuments(
            req.user.role === "admin" ? {} : { assignedTo: req.user._id }
        )

        const pendingTasks = await Task.countDocuments({
            ...filter,
            status: "Pending",
            ...(req.user.role === "admin" ? {} : { assignedTo: req.user._id })

        })

        const inProgressTasks = await Task.countDocuments({
            ...filter,
            status: "In progress",
            ...(req.user.role === "admin" ? {} : { assignedTo: req.user._id })

        })


        const completedTasks = await Task.countDocuments({
            ...filter,
            status: "Completed",
            ...(req.user.role === "admin" ? {} : { assignedTo: req.user._id })

        })

        res.json({
            tasks,
            statusSummary: {
                all: allTasks,
                pendingTasks,
                inProgressTasks,
                completedTasks
            }
        });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message })
    }
}

//@desc get All task By Id
//@route GET /api/tasks/:id
// @access private

const getTaskById = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id).populate(
            "assignedTo",
            "name email profileImageUrl"
        );

        if (!task) {
            return res.status(404).json({ message: "Task not found" })
        }

        res.json(task)

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message })
    }
}


//@desc update Task Details 
//@route PUT /api/tasks/:id
// @access private

const updateTask = async (req, res) => {
    try {

        const task = await Task.findById(req.params.id);

        if (!task) return res.status(404).json({ message: "Task not found" });

        task.title = req.body.title || task.title;
        task.description = req.body.description || task.description;
        task.priority = req.body.priority || task.priority;
        task.dueDate = req.body.dueDate || task.dueDate;
        task.todoChecklist = req.body.todoChecklist || task.todoChecklist;
        task.attachments = req.body.attachments || task.attachments;

        if (req.body.assignedTo) {
            if (!Array.isArray(req.body.assignedTo)) {
                return res.status(400).json({ message: "asssignTo must be an array of user Ids" });
            }
            task.assignedTo = req.body.assignedTo
        }

        const updateTask = await task.save();
        res.json({ message: "Task updated successfully" })

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message })
    }
}



//@desc Delete task  
//@route DELETE /api/tasks/:id
// @access private(Admin Only)
const deleteTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) return res.status(404).json({ message: "Task not found" });

        await task.deleteOne();

        res.json({ message: "Task Deleted successfully" })

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message })
    }
}




//@desc Update task  Status
//@route PUT /api/tasks/:id/status
// @access private(Admin Only)

const updateTaskStatus = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) return res.status(404).json({ message: "Task not found" });

        const isAssigned = task.assignedTo.some((userId) => {
            userId.toString() === req.user._id.toString()
        })

        if (!isAssigned && req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorized" });
        }

        task.status = req.body.status || task.status;


        if (task.status === "Completed") {
            task.todoChecklist.forEach((item) => item.completed = true);
            task.progress = 100;
        }

        await task.save();

        res.json({ message: "Task status updated ", task })

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message })
    }
}




//@desc Update task  chekclist
//@route PUT /api/tasks/:id/todo
// @access private(Admin Only)

const updateTaskCheckList = async (req, res) => {
    try {
        const { todoChecklist } = req.body

        const task = await Task.findById(req.params.id)

        if (!task) return res.status(404).json({ message: "Task not found" });
        if (!task.assignedTo.includes(req.user._id) && req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorized to update checklist" });
        }

        task.todoChecklist = todoChecklist // replace with update checklist


        //  Auto update progress based on checklist completion

        const CompletedCount = task.todoChecklist.filter((item) => item.completed).length;

        const totalItems = task.todoChecklist.length

        task.progress = totalItems > 0 ? Math.round((CompletedCount / totalItems) * 100) : 0

        // Auto-mark task as completed if all items are checked

        if (task.progress === 100) {
            task.status = "Completed"
        } else if (task.progress > 0) {
            task.status = "In progress"
        } else {
            task.status = "Pending"
        }


        await task.save();

        const updateTask = await Task.findById(req.params.id).populate(
            "assignedTo",
            "name email profileImageUrl"
        )


        res.json({ message: "Task checklist updated ", task: updateTask });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message })
    }
}


//@desc  DashBoard Data (Admin Only)
//@route GET /api/tasks/dashboard-data
// @access private

const getDashboardData = async (req, res) => {
    try {
        // fetch all statistics
        const totalTask = await Task.countDocuments();
        const pendingTasks = await Task.countDocuments({ status: "Pending" })
        const completedTasks = await Task.countDocuments({ status: "Completed" })
        const overdueTasks = await Task.countDocuments({
            status: { $ne: "Completed" },
            dueDate: { $lt: new Date() },
        })

        // Ensure that all possible statuses are included

        const taskStatuses = ["Pending", "In progress", "Completed"]
        const taskDistributionRaw = await Task.aggregate([
            {
                $group: {

                    _id: "$status",
                    count: { $sum: 1 }
                },
            },
        ]);

        const taskDistribution = taskStatuses.reduce((acc, status) => {
            const formattedKey = status.replace(/\s+/g, ""); // Remove spaces for response key
            acc[formattedKey] = taskDistributionRaw.find((item) => item._id === status)?.count || 0

            return acc;
        }, {});

        taskDistribution["All"] = totalTask  // Add total count to task distribution 



        // Ensure that all possible Priority level are included

        const taskPriorities = ["Low", "Medium", "High"]
        const taskPriorityLevelRaw = await Task.aggregate([
            {
                $group: {

                    _id: "$priority",
                    count: { $sum: 1 }
                },
            },
        ]);

        const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
            // const formattedKey=priority.replace(/\s+/g,""); // Remove spaces for response key
            acc[priority] = taskPriorityLevelRaw.find((item) => item._id === priority)?.count || 0

            return acc;
        }, {});

        // fetch recent 10 tasks

        const recentTask = await Task.find().sort({ createdAt: -1 }).limit(10).select("title status priority dueDate createdAt");
        res.status(200).json({
            statistics: {
                totalTask,
                pendingTasks,
                completedTasks,
                overdueTasks
            },
            charts: {
                taskDistribution,
                taskPriorityLevels
            },
            recentTask
        })


    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message })
    }
}



//@desc User DashBoard Data (User Specific)
//@route GET /api/tasks/user-dashboard-data
// @access private

const getUserDashboardData = async (req, res) => {
    try {

        const userId = req.user._id
        // fetch all statistics for specific loggedIn user
        const totalTask = await Task.countDocuments({ assignedTo: userId });
        const pendingTasks = await Task.countDocuments({ assignedTo: userId, status: "Pending" })
        const completedTasks = await Task.countDocuments({ assignedTo: userId, status: "Completed" })
        const overdueTasks = await Task.countDocuments({
            assignedTo: userId,
            status: { $ne: "Completed" },
            dueDate: { $lt: new Date() },
        })

        // Task distribution by status

        const taskStatuses = ["Pending", "In progress", "Completed"]
        const taskDistributionRaw = await Task.aggregate([
            { $match: { assignedTo: userId } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ])

        const taskDistribution = taskStatuses.reduce((acc, status) => {
            const formattedKey = status.replace(/\s+/g, ""); // Remove spaces for response key
            acc[formattedKey] = taskDistributionRaw.find((item) => item._id === status)?.count || 0

            return acc;
        }, {})


        taskDistribution["All"] = totalTask

        //    task distribution by priority

        const taskPriorities = ["Low", "Medium", "High"]
        const taskPriorityLevelRaw = await Task.aggregate([
            { $match: { assignedTo: userId } },
            { $group: { _id: "$priority", count: { $sum: 1 } } }
        ]);

        const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
            // const formattedKey=priority.replace(/\s+/g,""); // Remove spaces for response key
            acc[priority] = taskPriorityLevelRaw.find((item) => item._id === priority)?.count || 0

            return acc;
        }, {});

        // fetch recent 10 task
        const recentTask = await Task.find({ assignedTo: userId }).sort({ createdAt: -1 }).limit(10).select("title status priority dueDate createdAt");
        res.status(200).json({
            statistics: {
                totalTask,
                pendingTasks,
                completedTasks,
                overdueTasks
            },
            charts: {
                taskDistribution,
                taskPriorityLevels
            },
            recentTask
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message })
    }
}


module.exports = {
    getDashboardData,
    getTask, getTaskById,
    getUserDashboardData,
    updateTaskCheckList, updateTask,
    updateTaskStatus, createTask, deleteTask
}