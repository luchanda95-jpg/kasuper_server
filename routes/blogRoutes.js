// routes/blogRoutes.js
const express = require("express");
const BlogPost = require("../models/BlogPost");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

/**
 * This router is mounted in server.js as:
 *   app.use("/api/blogs", blogRoutes);
 *   app.use("/api/admin/blogs", blogRoutes);
 *
 * So:
 *   PUBLIC:
 *     GET  /api/blogs          -> router.get("/")
 *     GET  /api/blogs/:id      -> router.get("/:id")
 *
 *   ADMIN (dashboard):
 *     GET    /api/admin/blogs        -> router.get("/")
 *     POST   /api/admin/blogs        -> router.post("/")
 *     PUT    /api/admin/blogs/:id    -> router.put("/:id")
 *     DELETE /api/admin/blogs/:id    -> router.delete("/:id")
 */

// ---------- FILE UPLOAD SETUP (for blog images) ----------

const blogsUploadDir = path.join(__dirname, "..", "uploads", "blogs");
if (!fs.existsSync(blogsUploadDir)) {
  fs.mkdirSync(blogsUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, blogsUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const safeBase = base.replace(/\s+/g, "-").toLowerCase();
    cb(null, `${safeBase}-${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

/**
 * Helper to normalize the content field, which can come as:
 * - JSON string of an array
 * - Plain string
 * - Already an array
 */
function normalizeContent(rawContent) {
  if (!rawContent) return [];

  // If it's already an array (e.g. from JSON body)
  if (Array.isArray(rawContent)) {
    return rawContent.map((p) => String(p).trim()).filter(Boolean);
  }

  // If it's a string, it might be a JSON string or plain text
  if (typeof rawContent === "string") {
    // Try parse JSON first
    try {
      const parsed = JSON.parse(rawContent);
      if (Array.isArray(parsed)) {
        return parsed.map((p) => String(p).trim()).filter(Boolean);
      }
      // Not an array? Just fall back to single string
      return [rawContent.trim()].filter(Boolean);
    } catch (err) {
      // Not JSON at all, treat as single paragraph
      return [rawContent.trim()].filter(Boolean);
    }
  }

  // Fallback
  return [];
}

// ---------- PUBLIC: LIST & DETAILS ----------

// GET /api/blogs        OR  /api/admin/blogs
router.get("/", async (req, res) => {
  try {
    const posts = await BlogPost.find({}).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error("Get blogs error:", err);
    res.status(500).json({ message: "Failed to load blog posts" });
  }
});

// GET /api/blogs/:id    OR  /api/admin/blogs/:id
router.get("/:id", async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Blog post not found" });
    res.json(post);
  } catch (err) {
    console.error("Get blog error:", err);
    res.status(500).json({ message: "Failed to load blog post" });
  }
});

// ---------- CREATE (ADMIN – DASHBOARD) ----------
// POST /api/admin/blogs
// Because router is mounted at /api/admin/blogs, this matches that route.
router.post("/", upload.single("image"), async (req, res) => {
  try {
    let {
      title,
      tag,
      date,
      readingTime,
      author,
      image, // optional URL from form
      excerpt,
      content,
    } = req.body;

    // Normalize content into array of paragraphs
    const contentArray = normalizeContent(content);

    // Decide final image URL:
    // - if we uploaded a file, use /uploads/blogs/...
    // - else, keep the manual "image" URL from the form
    let imageUrl = image || "";
    if (req.file) {
      imageUrl = `${req.protocol}://${req.get("host")}/uploads/blogs/${
        req.file.filename
      }`;
    }

    const post = await BlogPost.create({
      title,
      tag,
      date,
      readingTime,
      author,
      image: imageUrl,
      excerpt,
      content: contentArray,
    });

    res.status(201).json(post);
  } catch (err) {
    console.error("Create blog error:", err);
    res.status(500).json({ message: "Failed to create blog post" });
  }
});

// ---------- UPDATE (ADMIN – DASHBOARD) ----------
// PUT /api/admin/blogs/:id
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const updates = { ...req.body };

    // Normalize content if present
    if (updates.content) {
      updates.content = normalizeContent(updates.content);
    }

    // If a new file is uploaded, override the image field
    if (req.file) {
      updates.image = `${req.protocol}://${req.get("host")}/uploads/blogs/${
        req.file.filename
      }`;
    }

    const post = await BlogPost.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!post) return res.status(404).json({ message: "Blog post not found" });
    res.json(post);
  } catch (err) {
    console.error("Update blog error:", err);
    res.status(500).json({ message: "Failed to update blog post" });
  }
});

// ---------- DELETE (ADMIN – DASHBOARD) ----------
// DELETE /api/admin/blogs/:id
router.delete("/:id", async (req, res) => {
  try {
    const post = await BlogPost.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ message: "Blog post not found" });
    res.json({ message: "Deleted", post });
  } catch (err) {
    console.error("Delete blog error:", err);
    res.status(500).json({ message: "Failed to delete blog post" });
  }
});

module.exports = router;
