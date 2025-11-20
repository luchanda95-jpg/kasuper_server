// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");

// routes
const adminUserRoutes = require("./routes/adminUserRoutes");
const adminOverviewRoutes = require("./routes/adminOverviewRoutes");
const carRoutes = require("./routes/carRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const blogRoutes = require("./routes/blogRoutes");
const authRoutes = require("./routes/authRoutes"); // admin auth
const testimonialRoutes = require("./routes/testimonialRoutes");
const newsletterRoutes = require("./routes/newsletterRoutes");
const userAuthRoutes = require("./routes/userAuthRoutes"); // customer signup/login

// middleware
const { requireAuth } = require("./middleware/authMiddleware");

const app = express();

// ---- Connect to MongoDB ----
connectDB();

// ---- Middleware ----
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images (cars/testimonials/blogs)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// -------------------- AUTH --------------------

// Admin auth
app.use("/api/auth", authRoutes); 
// Customer auth (signup/login)
app.use("/api/users", userAuthRoutes);

// -------------------- PUBLIC ROUTES --------------------

// Cars public browsing
app.use("/api/cars", carRoutes);

// Public bookings (IMPORTANT: your bookingRoutes should protect POST / and GET /my
// via requireUser inside the route file, not here)
app.use("/api/bookings", bookingRoutes);

// Public blogs
app.use("/api/blogs", blogRoutes);

// Public testimonials
app.use("/api/testimonials", testimonialRoutes);

// Public newsletter subscribe
app.use("/api/newsletter", newsletterRoutes);

// -------------------- ADMIN PROTECTED ROUTES --------------------

// Admin overview dashboard
app.use("/api/admin/overview", requireAuth, adminOverviewRoutes);

// Admin cars
app.use("/api/admin/cars", requireAuth, carRoutes);

// Admin bookings
app.use("/api/admin/bookings", requireAuth, bookingRoutes);

// Admin blogs
app.use("/api/admin/blogs", requireAuth, blogRoutes);

// Admin testimonials
app.use("/api/admin/testimonials", requireAuth, testimonialRoutes);

// Admin newsletter management
app.use("/api/admin/newsletter", requireAuth, newsletterRoutes);

// Admin manage customer users
app.use("/api/admin/users", requireAuth, adminUserRoutes);

// -------------------- Health check --------------------
app.get("/", (req, res) => {
  res.send("Kasupe API (MongoDB) is running.");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Kasupe API running on http://localhost:${PORT}`);
});
