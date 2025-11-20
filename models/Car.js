// models/Car.js
const mongoose = require("mongoose");

const carSchema = new mongoose.Schema(
  {
    brand: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    category: { type: String, required: true }, // Sedan, SUV, etc.
    transmission: { type: String, required: true },
    fuel_type: { type: String, required: true }, // Petrol, Diesel, etc.
    seating_capacity: { type: Number, required: true },
    location: { type: String, required: true },  // e.g. Lusaka, Chipata
    pricePerDay: { type: Number, required: true },
    description: { type: String },
    image: { type: String }, // URL to uploaded image
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Car", carSchema);
