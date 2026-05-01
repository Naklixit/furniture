const express = require("express");
const router = express.Router();

const { requireAuth, requireAdmin } = require("../middleware/auth");
const {
  getMe,
  updateMe,
  listUsers,
  updateUserRole,
  deleteUserById,
} = require("../controllers/user.controller");

router.get("/me", requireAuth, getMe);
router.patch("/me", requireAuth, updateMe);

// Admin: quản lý người dùng
router.get("/", requireAdmin, listUsers);
router.patch("/:id/role", requireAdmin, updateUserRole);
router.delete("/:id", requireAdmin, deleteUserById);

module.exports = router;
