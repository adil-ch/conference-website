const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

const User = require("../models/User");
const Registration = require("../models/Registration");

// --------------------
// Middleware to check admin login
// --------------------
function isAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).send("Access denied");
  }
  next();
}

// --------------------
// Admin login page
// --------------------
router.get("/login", (req, res) => {
  res.render("admin-login"); // create views/admin-login.ejs
});

// --------------------
// Admin login POST
// --------------------
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email, role: "admin" });
    if (!user) return res.status(401).send("Invalid credentials");

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).send("Invalid credentials");

    // Save admin info in session
    req.session.user = { id: user._id, name: user.name, role: user.role };
    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// --------------------
// Admin logout
// --------------------
router.post("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/admin/login");
});

// --------------------
// Admin dashboard
// --------------------
router.get("/dashboard", isAdmin, async (req, res) => {
  try {
    const registrations = await Registration.find().populate("user");
    res.render("admin-dashboard", { registrations, admin: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
