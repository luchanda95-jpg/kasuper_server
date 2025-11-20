// routes/adminOverviewRoutes.js
const express = require("express");
const Car = require("../models/Car");
const Booking = require("../models/Booking");

const router = express.Router();

// Case-insensitive exact match
const statusIs = (value) => ({ $regex: `^${value}$`, $options: "i" });

// revenue field (supports totalPrice or price)
const revenueExpr = {
  $ifNull: ["$totalPrice", { $ifNull: ["$price", 0] }],
};

// statuses that count as “revenue bookings”
const revenueStatusMatch = {
  status: { $in: [/^confirmed$/i, /^active$/i, /^completed$/i] },
};

// GET /api/admin/overview
router.get("/", async (req, res) => {
  try {
    const now = new Date();

    // ------------------- BASE TOTALS -------------------
    const [
      totalCars,
      totalBookings,
      pendingBookings,
      completedBookings,
      cancelledBookings,
    ] = await Promise.all([
      Car.countDocuments({}),
      Booking.countDocuments({}),
      Booking.countDocuments({ status: statusIs("pending") }),
      Booking.countDocuments({ status: statusIs("completed") }),
      Booking.countDocuments({ status: statusIs("cancelled") }),
    ]);

    // Cancellation rate %
    const cancellationRate =
      totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;

    // ------------------- UTILIZATION RATE -------------------
    // “Utilized” = confirmed/active and currently within pickup-return dates
    const activeBookings = await Booking.countDocuments({
      status: { $in: [/^confirmed$/i, /^active$/i] },
      pickupDate: { $lte: now },
      returnDate: { $gte: now },
    });

    const utilizationRate =
      totalCars > 0 ? (activeBookings / totalCars) * 100 : 0;

    // ------------------- AVG BOOKING LENGTH -------------------
    const avgLengthAgg = await Booking.aggregate([
      {
        $match: {
          pickupDate: { $ne: null },
          returnDate: { $ne: null },
        },
      },
      {
        $project: {
          days: {
            $add: [
              {
                $divide: [
                  { $subtract: ["$returnDate", "$pickupDate"] },
                  1000 * 60 * 60 * 24,
                ],
              },
              1,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgDays: { $avg: "$days" },
        },
      },
    ]);

    const avgBookingLength = avgLengthAgg[0]?.avgDays || 0;

    // ------------------- TOP 5 MOST BOOKED CARS -------------------
    const topCars = await Booking.aggregate([
      { $match: { car: { $ne: null } } },
      {
        $group: {
          _id: "$car",
          bookings: { $sum: 1 },
          revenue: { $sum: revenueExpr },
        },
      },
      { $sort: { bookings: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "cars",
          localField: "_id",
          foreignField: "_id",
          as: "car",
        },
      },
      { $unwind: { path: "$car", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          carId: "$_id",
          brand: "$car.brand",
          model: "$car.model",
          image: "$car.image",
          location: "$car.location",
          bookings: 1,
          revenue: 1,
        },
      },
    ]);

    // ------------------- PAYMENT SPLIT -------------------
    // read from notes (Payment method: MTN Mobile Money / Airtel Money / Credit/Debit Card)
    const paymentAgg = await Booking.aggregate([
      {
        $project: {
          method: {
            $switch: {
              branches: [
                {
                  case: {
                    $regexMatch: {
                      input: { $ifNull: ["$notes", ""] },
                      regex: /mtn/i,
                    },
                  },
                  then: "MTN",
                },
                {
                  case: {
                    $regexMatch: {
                      input: { $ifNull: ["$notes", ""] },
                      regex: /airtel/i,
                    },
                  },
                  then: "Airtel",
                },
                {
                  case: {
                    $regexMatch: {
                      input: { $ifNull: ["$notes", ""] },
                      regex: /card|credit|debit/i,
                    },
                  },
                  then: "Card",
                },
              ],
              default: "Unknown",
            },
          },
        },
      },
      {
        $group: {
          _id: "$method",
          count: { $sum: 1 },
        },
      },
    ]);

    const paymentSplit = paymentAgg.reduce(
      (acc, cur) => {
        const k = cur._id.toLowerCase();
        acc[k] = cur.count;
        return acc;
      },
      { mtn: 0, airtel: 0, card: 0, unknown: 0 }
    );

    // ------------------- PERFORMANCE SERIES -------------------

    // DAILY (last 7 days)
    const dailyStart = new Date(now);
    dailyStart.setDate(dailyStart.getDate() - 6);

    const dailySeriesRaw = await Booking.aggregate([
      {
        $match: {
          ...revenueStatusMatch,
          pickupDate: { $gte: dailyStart, $lte: now },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$pickupDate" },
          },
          revenue: { $sum: revenueExpr },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dailySeries = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(dailyStart);
      d.setDate(dailyStart.getDate() + i);
      const key = d.toISOString().slice(0, 10);

      const found = dailySeriesRaw.find((x) => x._id === key);
      dailySeries.push({
        period: key,
        label: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        revenue: found?.revenue || 0,
        bookings: found?.bookings || 0,
      });
    }

    // WEEKLY (last 8 weeks)
    const weeklyStart = new Date(now);
    weeklyStart.setDate(weeklyStart.getDate() - 7 * 7);

    const weeklySeriesRaw = await Booking.aggregate([
      {
        $match: {
          ...revenueStatusMatch,
          pickupDate: { $gte: weeklyStart, $lte: now },
        },
      },
      {
        $group: {
          _id: {
            year: { $isoWeekYear: "$pickupDate" },
            week: { $isoWeek: "$pickupDate" },
          },
          revenue: { $sum: revenueExpr },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.week": 1 } },
      { $limit: 8 },
    ]);

    const weeklySeries = weeklySeriesRaw.map((w) => ({
      period: `${w._id.year}-W${String(w._id.week).padStart(2, "0")}`,
      label: `W${w._id.week}`,
      revenue: w.revenue || 0,
      bookings: w.bookings || 0,
    }));

    // MONTHLY (last 12 months)
    const monthlyStart = new Date(now);
    monthlyStart.setMonth(monthlyStart.getMonth() - 11);

    const monthlySeriesRaw = await Booking.aggregate([
      {
        $match: {
          ...revenueStatusMatch,
          pickupDate: { $gte: monthlyStart, $lte: now },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$pickupDate" },
            month: { $month: "$pickupDate" },
          },
          revenue: { $sum: revenueExpr },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 },
    ]);

    const monthlySeries = monthlySeriesRaw.map((m) => {
      const monthName = new Date(m._id.year, m._id.month - 1, 1).toLocaleDateString(
        "en-GB",
        { month: "short" }
      );
      return {
        period: `${m._id.year}-${String(m._id.month).padStart(2, "0")}`,
        label: `${monthName} ${String(m._id.year).slice(-2)}`,
        revenue: m.revenue || 0,
        bookings: m.bookings || 0,
      };
    });

    // YEARLY (last 5 years)
    const yearlyStart = new Date(now);
    yearlyStart.setFullYear(yearlyStart.getFullYear() - 4);

    const yearlySeriesRaw = await Booking.aggregate([
      {
        $match: {
          ...revenueStatusMatch,
          pickupDate: { $gte: yearlyStart, $lte: now },
        },
      },
      {
        $group: {
          _id: { year: { $year: "$pickupDate" } },
          revenue: { $sum: revenueExpr },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1 } },
      { $limit: 5 },
    ]);

    const yearlySeries = yearlySeriesRaw.map((y) => ({
      period: String(y._id.year),
      label: String(y._id.year),
      revenue: y.revenue || 0,
      bookings: y.bookings || 0,
    }));

    // Revenue this selected period (default monthly-like overall)
    const monthlyRevenue = dailySeries.reduce((s, d) => s + d.revenue, 0);

    // Recent bookings
    const recentBookings = await Booking.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("car")
      .lean();

    res.json({
      // base
      totalCars,
      totalBookings,
      pendingBookings,
      completedBookings,
      cancelledBookings,
      monthlyRevenue,

      // KPIs
      activeBookings,
      utilizationRate,
      avgBookingLength,
      cancellationRate,
      topCars,
      paymentSplit,

      // series
      dailySeries,
      weeklySeries,
      monthlySeries,
      yearlySeries,

      recentBookings,
    });
  } catch (err) {
    console.error("Overview error:", err);
    res.status(500).json({ message: "Failed to load overview data" });
  }
});

module.exports = router;
