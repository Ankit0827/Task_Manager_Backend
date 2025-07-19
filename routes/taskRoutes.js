const express=require("express");
const { protect } = require("../middlewares/authMiddleware");
const { getDashboardData, getUserDashboardData, getTask, getTaskById, createTask, updateTask, deleteTask, updateTaskStatus, updateTaskCheckList } = require("../controllers/taskController");


const router=express.Router();

// Task Management Routes

router.get("/dashboard-data",protect,getDashboardData)
router.get("/user-dashboard-data",protect,getUserDashboardData)
router.get("/",protect,getTask)  // get All task (Admin:all, assign:user)
router.get("/:id",protect,getTaskById) //get Task By Id
router.post("/",protect,createTask) // create Task (Admin only)
router.put("/:id",protect,updateTask)  // update task detaild
router.delete("/:id",protect,deleteTask)  //Delete Task Admin only 
router.put("/:id/status",protect,updateTaskStatus) //upate task Status
router.put("/:id/todo",protect,updateTaskCheckList)  //Update task cheklist

module.exports=router