const express = require("express");
const bcrypt = require("bcryptjs");
const AdminUser = require("../models/AdminUser");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * Helper: only admin users allowed (you can later add superadmin roles)
 */
function requireAdminRole(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

/**
 * GET /api/admin/users
 * List all admins
 */
router.get("/", requireAuth, requireAdminRole, async (req, res) => {
  try {
    const admins = await AdminUser.find({})
      .select("_id name email role createdAt");
    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: "Failed to load admins" });
  }
});

/**
 * PUT /api/admin/users/me/password
 * Change own password
 * body: { oldPassword, newPassword }
 */
router.put("/me/password", requireAuth, requireAdminRole, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Old and new password required" });
    }

    const user = await AdminUser.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Admin not found" });

    const ok = await user.comparePassword(oldPassword);
    if (!ok) return res.status(401).json({ message: "Old password is wrong" });

    const newHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = newHash;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "Failed to change password" });
  }
});

/**
 * POST /api/admin/users/invite
 * Invite/create a new admin
 * body: { email, name, password }
 *
 * For now: creates instantly.
 * Later: send email invite + reset link.
 */
router.post("/invite", requireAuth, requireAdminRole, async (req, res) => {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const existing = await AdminUser.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const admin = await AdminUser.create({
      email: email.toLowerCase(),
      name,
      passwordHash,
      role: "admin",
    });

    res.status(201).json({
      message: "Admin invited/created successfully",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error("Invite admin error:", err);
    res.status(500).json({ message: "Failed to invite admin" });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Remove an admin (optional)
 */
router.delete("/:id", requireAuth, requireAdminRole, async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ message: "You cannot delete yourself" });
    }

    await AdminUser.findByIdAndDelete(id);
    res.json({ message: "Admin deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete admin" });
  }
});

module.exports = router;
