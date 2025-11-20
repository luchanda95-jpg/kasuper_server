// routes/carRoutes.js
const express = require("express");
const Car = require("../models/Car");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

/**
 * This router is mounted in server.js as:
 *   app.use("/api/cars", carRoutes);
 *   app.use("/api/admin/cars", carRoutes);
 *
 * So:
 *   PUBLIC:
 *     GET    /api/cars           -> router.get("/")
 *     GET    /api/cars/:id       -> router.get("/:id")
 *
 *   ADMIN (dashboard):
 *     GET    /api/admin/cars     -> router.get("/")
 *     POST   /api/admin/cars     -> router.post("/")
 *     PUT    /api/admin/cars/:id -> router.put("/:id")
 *     DELETE /api/admin/cars/:id -> router.delete("/:id")
 */

// ---------- FILE UPLOAD SETUP (for car images) ----------

const carsUploadDir = path.join(__dirname, "..", "uploads", "cars");
if (!fs.existsSync(carsUploadDir)) {
  fs.mkdirSync(carsUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, carsUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const safeBase = base.replace(/\s+/g, "-").toLowerCase();
    cb(null, `${safeBase}-${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

function normalizeBoolean(val, defaultValue = true) {
  if (val === undefined || val === null) return defaultValue;
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    const v = val.toLowerCase();
    return v === "true" || v === "1" || v === "on" || v === "yes";
  }
  return Boolean(val);
}

// ---------- PUBLIC ROUTES ----------

// GET /api/cars?onlyAvailable=true
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.onlyAvailable === "true") {
      filter.isAvailable = true;
    }

    const cars = await Car.find(filter).sort({ createdAt: -1 });
    res.json(cars);
  } catch (err) {
    console.error("Get cars error:", err);
    res.status(500).json({ message: "Failed to load cars" });
  }
});

// GET /api/cars/:id
router.get("/:id", async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      return res.status(404).json({ message: "Car not found" });
    }
    res.json(car);
  } catch (err) {
    console.error("Get car error:", err);
    res.status(500).json({ message: "Failed to load car" });
  }
});

// ---------- ADMIN CREATE / UPDATE / DELETE ----------

// POST /api/admin/cars (also works for /api/cars if you call it)
// accepts multipart/form-data with optional file field: "image"
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const {
      brand,
      model,
      year,
      pricePerDay,
      category,
      transmission,
      fuel_type,
      seating_capacity,
      location,
      description,
      isAvailable,
    } = req.body;

    let imageUrl = "";
    if (req.file) {
      imageUrl = `${req.protocol}://${req.get("host")}/uploads/cars/${
        req.file.filename
      }`;
    }

    const car = await Car.create({
      brand,
      model,
      year: year ? Number(year) : undefined,
      pricePerDay: pricePerDay ? Number(pricePerDay) : undefined,
      category,
      transmission,
      fuel_type,
      seating_capacity: seating_capacity ? Number(seating_capacity) : undefined,
      location,
      description,
      image: imageUrl,
      isAvailable: normalizeBoolean(isAvailable, true),
    });

    res.status(201).json(car);
  } catch (err) {
    console.error("Create car error:", err);
    res.status(500).json({ message: "Failed to add car" });
  }
});

// PUT /api/admin/cars/:id
// accepts multipart/form-data (for image) OR JSON (no image)
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    // If JSON was sent, body is already parsed by express.json()
    const {
      brand,
      model,
      year,
      pricePerDay,
      category,
      transmission,
      fuel_type,
      seating_capacity,
      location,
      description,
      isAvailable,
      image,
    } = req.body;

    const updates = {};

    if (brand !== undefined) updates.brand = brand;
    if (model !== undefined) updates.model = model;
    if (year !== undefined) updates.year = Number(year);
    if (pricePerDay !== undefined) updates.pricePerDay = Number(pricePerDay);
    if (category !== undefined) updates.category = category;
    if (transmission !== undefined) updates.transmission = transmission;
    if (fuel_type !== undefined) updates.fuel_type = fuel_type;
    if (seating_capacity !== undefined)
      updates.seating_capacity = Number(seating_capacity);
    if (location !== undefined) updates.location = location;
    if (description !== undefined) updates.description = description;

    if (isAvailable !== undefined) {
      updates.isAvailable = normalizeBoolean(isAvailable, true);
    }

    // If a new file was uploaded, override image URL
    if (req.file) {
      updates.image = `${req.protocol}://${req.get("host")}/uploads/cars/${
        req.file.filename
      }`;
    } else if (image !== undefined) {
      // if image string was sent explicitly (e.g. to clear or change)
      updates.image = image;
    }

    const car = await Car.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!car) {
      return res.status(404).json({ message: "Car not found" });
    }

    res.json(car);
  } catch (err) {
    console.error("Update car error:", err);
    res.status(500).json({ message: "Failed to update car" });
  }
});

// DELETE /api/admin/cars/:id
router.delete("/:id", async (req, res) => {
  try {
    const car = await Car.findByIdAndDelete(req.params.id);
    if (!car) {
      return res.status(404).json({ message: "Car not found" });
    }
    res.json({ message: "Deleted", car });
  } catch (err) {
    console.error("Delete car error:", err);
    res.status(500).json({ message: "Failed to delete car" });
  }
});

module.exports = router;
