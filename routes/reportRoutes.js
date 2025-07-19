const express=require("express");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const { exportTasksReport, exportUserReport } = require("../controllers/reportController");

const router =express.Router();

router.get("/export/tasks" , protect ,adminOnly,exportTasksReport) // Export all tasks report in execel/pdf (Admin only)
router.get("/export/users" , protect ,adminOnly,exportUserReport)  // Export user tasks report in execel/pdf (specific user by Admin)

module.exports=router