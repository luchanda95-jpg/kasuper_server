// models/BlogPost.js
const mongoose = require("mongoose");

const blogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    tag: { type: String },           // Safari route, Tips, etc.
    date: { type: String },          // e.g. "12 Nov 2025"
    readingTime: { type: String },   // "5 min read"
    author: { type: String },
    image: { type: String },         // URL to image
    excerpt: { type: String },
    content: [{ type: String }],     // paragraphs
  },
  { timestamps: true }
);

module.exports = mongoose.model("BlogPost", blogPostSchema);
