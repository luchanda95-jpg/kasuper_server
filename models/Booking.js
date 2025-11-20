// models/Booking.js
const mongoose = require("mongoose");

const STATUS_VALUES = ["Pending", "Confirmed", "Completed", "Cancelled"];

const bookingSchema = new mongoose.Schema(
  {
    // Link to a car (optional but recommended)
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
    },

    // A snapshot of car info (useful for display even if car is deleted later)
    carBrand: { type: String },
    carModel: { type: String },
    carPlate: { type: String },

    // Customer details
    customerName: { type: String, required: true },
    customerEmail: { type: String },
    customerPhone: { type: String },

    // Booking dates
    pickupDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },

    // Status flow
    status: {
      type: String,
      enum: STATUS_VALUES,
      default: "Pending",
    },

    // Optional fields
    totalPrice: { type: Number },
    notes: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
module.exports.STATUS_VALUES = STATUS_VALUES;
