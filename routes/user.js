const express = require("express");
const router = express.Router();

const Registration = require("../models/Registration");

// Middleware to check login
function isLoggedIn(req, res, next) {
  if (!req.session.user) return res.redirect("/auth/login");
  next();
}

// User dashboard
router.get("/dashboard", isLoggedIn, async (req, res) => {
  try {
    // Get registrations for logged-in user only
    const registrations = await Registration.find({
      user: req.session.user.id,
    });
    res.render("user-dashboard", { registrations, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
