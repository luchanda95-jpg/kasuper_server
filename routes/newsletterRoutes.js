const express = require("express");
const Subscriber = require("../models/Subscriber");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// helper: basic email validation
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * PUBLIC
 * POST /api/newsletter/subscribe
 * Body: { email }
 */
router.post("/subscribe", async (req, res) => {
  try {
    const rawEmail = (req.body.email || "").toLowerCase().trim();

    if (!rawEmail) {
      return res.status(400).json({ message: "Email is required." });
    }

    if (!isValidEmail(rawEmail)) {
      return res.status(400).json({ message: "Please enter a valid email." });
    }

    // check if exists
    const existing = await Subscriber.findOne({ email: rawEmail });

    if (existing) {
      // if exists but inactive, reactivate
      if (!existing.isActive) {
        existing.isActive = true;
        await existing.save();
        return res.json({ message: "Welcome back! You are subscribed again." });
      }

      return res.json({ message: "You are already subscribed." });
    }

    await Subscriber.create({ email: rawEmail, isActive: true });

    res.status(201).json({ message: "Subscription successful. Thank you!" });
  } catch (err) {
    console.error("Subscribe error:", err);
    res.status(500).json({ message: "Failed to subscribe." });
  }
});

/**
 * ADMIN
 * GET /api/newsletter/admin/list
 * Protected with JWT
 */
router.get("/admin/list", requireAuth, async (req, res) => {
  try {
    const items = await Subscriber.find({})
      .sort({ createdAt: -1 });

    res.json(items);
  } catch (err) {
    console.error("Admin list subscribers error:", err);
    res.status(500).json({ message: "Failed to load subscribers." });
  }
});

/**
 * ADMIN
 * PUT /api/newsletter/admin/:id/toggle
 * Protected with JWT
 */
router.put("/admin/:id/toggle", requireAuth, async (req, res) => {
  try {
    const sub = await Subscriber.findById(req.params.id);
    if (!sub) return res.status(404).json({ message: "Subscriber not found." });

    sub.isActive = !sub.isActive;
    await sub.save();

    res.json(sub);
  } catch (err) {
    console.error("Toggle subscriber error:", err);
    res.status(500).json({ message: "Failed to update subscriber." });
  }
});

/**
 * ADMIN
 * DELETE /api/newsletter/admin/:id
 * Protected with JWT
 */
router.delete("/admin/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await Subscriber.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Subscriber not found." });

    res.json({ message: "Subscriber deleted." });
  } catch (err) {
    console.error("Delete subscriber error:", err);
    res.status(500).json({ message: "Failed to delete subscriber." });
  }
});

module.exports = router;
