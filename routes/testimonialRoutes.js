// routes/testimonialRoutes.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const Testimonial = require("../models/Testimonial");

const router = express.Router();

// ---------- Multer setup ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "-");
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

// ---------- PUBLIC ----------
// GET /api/testimonials
router.get("/", async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();
    res.json(testimonials);
  } catch (err) {
    console.error("Get testimonials error:", err);
    res.status(500).json({ message: "Failed to load testimonials" });
  }
});

// ---------- ADMIN ----------
// GET /api/admin/testimonials
router.get("/admin/list", async (req, res) => {
  try {
    const testimonials = await Testimonial.find({})
      .sort({ createdAt: -1 })
      .lean();
    res.json(testimonials);
  } catch (err) {
    console.error("Admin list testimonials error:", err);
    res.status(500).json({ message: "Failed to load testimonials" });
  }
});

// POST /api/admin/testimonials
router.post("/admin", upload.single("image"), async (req, res) => {
  try {
    const { name, role, trip, text, rating, isActive } = req.body;

    if (!name || !text) {
      return res.status(400).json({ message: "Name and text are required" });
    }

    const imagePath = req.file ? `/uploads/${req.file.filename}` : req.body.image;

    const created = await Testimonial.create({
      name: name.trim(),
      role: role?.trim() || "",
      trip: trip?.trim() || "",
      text: text.trim(),
      rating: Number(rating) || 5,
      image: imagePath || "",
      isActive: isActive !== undefined ? isActive === "true" : true,
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("Create testimonial error:", err);
    res.status(500).json({ message: "Failed to create testimonial" });
  }
});

// PUT /api/admin/testimonials/:id
router.put("/admin/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, role, trip, text, rating, isActive } = req.body;

    const found = await Testimonial.findById(req.params.id);
    if (!found) return res.status(404).json({ message: "Not found" });

    if (name !== undefined) found.name = name.trim();
    if (role !== undefined) found.role = role.trim();
    if (trip !== undefined) found.trip = trip.trim();
    if (text !== undefined) found.text = text.trim();
    if (rating !== undefined) found.rating = Number(rating) || 5;
    if (isActive !== undefined) found.isActive = isActive === "true";

    if (req.file) {
      found.image = `/uploads/${req.file.filename}`;
    } else if (req.body.image !== undefined) {
      found.image = req.body.image;
    }

    await found.save();
    res.json(found);
  } catch (err) {
    console.error("Update testimonial error:", err);
    res.status(500).json({ message: "Failed to update testimonial" });
  }
});

// DELETE /api/admin/testimonials/:id
router.delete("/admin/:id", async (req, res) => {
  try {
    const deleted = await Testimonial.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Delete testimonial error:", err);
    res.status(500).json({ message: "Failed to delete testimonial" });
  }
});

module.exports = router;
