// routes/bookingRoutes.js
const express = require("express");
const Booking = require("../models/Booking");
const { STATUS_VALUES } = require("../models/Booking");

const router = express.Router();

/**
 * GET /api/bookings
 * Optional query: ?status=Pending
 */
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.status && STATUS_VALUES.includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .populate(
        "car",
        "brand model category year location transmission fuel_type seating_capacity image pricePerDay"
      );

    res.json(bookings);
  } catch (err) {
    console.error("Get bookings error:", err);
    res.status(500).json({ message: "Failed to load bookings" });
  }
});

/**
 * GET /api/bookings/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate(
      "car",
      "brand model category year location transmission fuel_type seating_capacity image pricePerDay"
    );
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.json(booking);
  } catch (err) {
    console.error("Get booking error:", err);
    res.status(500).json({ message: "Failed to load booking" });
  }
});

/**
 * POST /api/bookings
 */
router.post("/", async (req, res) => {
  try {
    const {
      car, // car id (optional)
      carBrand,
      carModel,
      carPlate,
      customerName,
      customerEmail,
      customerPhone,
      pickupDate,
      returnDate,
      status,
      totalPrice,
      notes,
    } = req.body;

    const booking = await Booking.create({
      car: car || undefined,
      carBrand,
      carModel,
      carPlate,
      customerName,
      customerEmail,
      customerPhone,
      pickupDate,
      returnDate,
      status: STATUS_VALUES.includes(status) ? status : undefined, // default = Pending
      totalPrice,
      notes,
    });

    const populated = await booking.populate(
      "car",
      "brand model category year location transmission fuel_type seating_capacity image pricePerDay"
    );

    res.status(201).json(populated);
  } catch (err) {
    console.error("Create booking error:", err);
    res.status(500).json({ message: "Failed to create booking" });
  }
});

/**
 * PUT /api/bookings/:id/status
 */
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!STATUS_VALUES.includes(status)) {
      return res.status(400).json({
        message: "Invalid status value",
        allowed: STATUS_VALUES,
      });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true, runValidators: true }
    ).populate(
      "car",
      "brand model category year location transmission fuel_type seating_capacity image pricePerDay"
    );

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json(booking);
  } catch (err) {
    console.error("Update status error:", err);
    res.status(500).json({ message: "Failed to update booking status" });
  }
});

/**
 * PUT /api/bookings/:id (optional full update)
 */
router.put("/:id", async (req, res) => {
  try {
    const updates = { ...req.body };

    if (typeof updates.status !== "undefined") {
      if (!STATUS_VALUES.includes(updates.status)) {
        return res.status(400).json({
          message: "Invalid status value",
          allowed: STATUS_VALUES,
        });
      }
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate(
      "car",
      "brand model category year location transmission fuel_type seating_capacity image pricePerDay"
    );

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json(booking);
  } catch (err) {
    console.error("Update booking error:", err);
    res.status(500).json({ message: "Failed to update booking" });
  }
});

/**
 * DELETE /api/bookings/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.json({ message: "Deleted", booking });
  } catch (err) {
    console.error("Delete booking error:", err);
    res.status(500).json({ message: "Failed to delete booking" });
  }
});

module.exports = router;
