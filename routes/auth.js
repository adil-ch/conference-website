const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");

/* ======= RENDER PAGES ======= */

const csrf = require("csurf");
const csrfProtection = csrf({ cookie: true });

const crypto = require("crypto");
const nodemailer = require("nodemailer");

//forgot password

router.get("/forgot", csrfProtection, (req, res) => {
  res.render("forgot", { csrfToken: req.csrfToken() });
});

// Register page
router.get("/register", csrfProtection, (req, res) => {
  res.render("register", { csrfToken: req.csrfToken() });
});

// Login page
router.get("/login", csrfProtection, (req, res) => {
  res.render("login", { csrfToken: req.csrfToken() });
});

/* ======= POST ACTIONS ======= */

// Render reset password page
router.get("/reset/:token", csrfProtection, async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }, // token not expired
    });

    if (!user) {
      return res.render("forgot", {
        csrfToken: req.csrfToken(),
        error: "Password reset token is invalid or has expired.",
      });
    }

    res.render("reset", {
      csrfToken: req.csrfToken(),
      token: req.params.token,
    });
  } catch (err) {
    console.error(err);
    res.render("forgot", {
      csrfToken: req.csrfToken(),
      error: "Something went wrong. Try again later.",
    });
  }
});

// Handle reset password form submission
router.post("/reset/:token", csrfProtection, async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.render("forgot", {
        csrfToken: req.csrfToken(),
        error: "Password reset token is invalid or has expired.",
      });
    }

    if (password !== confirmPassword) {
      return res.render("reset", {
        csrfToken: req.csrfToken(),
        token: req.params.token,
        error: "Passwords do not match.",
      });
    }

    // Update password and clear token fields
    user.password = password; // will be hashed by pre-save hook
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.render("login", {
      csrfToken: req.csrfToken(),
      success: "Password has been reset. You can now login.",
    });
  } catch (err) {
    console.error(err);
    res.render("reset", {
      csrfToken: req.csrfToken(),
      token: req.params.token,
      error: "Something went wrong. Try again later.",
    });
  }
});

// Handle forgot password form
router.post("/forgot", csrfProtection, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.render("forgot", {
        csrfToken: req.csrfToken(),
        error: "No account with that email exists",
      });
    }

    // Generate token
    const token = crypto.randomBytes(20).toString("hex");

    // Set token and expiry (1 hour)
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    // Setup nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // your email
        pass: process.env.EMAIL_PASS, // app password
      },
    });

    const resetURL = `${process.env.BASE_URL}/auth/reset/${token}`;

    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: "Conference App Password Reset",
      text: `You requested a password reset.\n\nClick the link below to reset your password:\n\n${resetURL}\n\nIf you did not request this, ignore this email.`,
    };

    await transporter.sendMail(mailOptions);

    res.render("forgot", {
      csrfToken: req.csrfToken(),
      success: "Password reset link sent to your email.",
    });
  } catch (err) {
    console.error(err);
    res.render("forgot", {
      csrfToken: req.csrfToken(),
      error: "Something went wrong. Try again later.",
    });
  }
});

// Register user
// Register user
router.post("/register", csrfProtection, async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // 1. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.render("register", {
        csrfToken: req.csrfToken(),
        error: "Invalid email address",
      });
    }

    // 2. Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render("register", {
        csrfToken: req.csrfToken(),
        error: "Email is already registered",
      });
    }

    // 3. Check passwords match
    if (password !== confirmPassword) {
      return res.render("register", {
        csrfToken: req.csrfToken(),
        error: "Passwords do not match",
      });
    }

    // 4. Save user
    const user = new User({ name, email, password });
    await user.save();

    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    res.redirect("/user/dashboard");
  } catch (err) {
    res.render("register", {
      csrfToken: req.csrfToken(),
      error: "Error registering user: " + err.message,
    });
  }
});

// Login
router.post("/login", csrfProtection, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).render("login", {
        csrfToken: req.csrfToken(),
        error: "No account found with this email.",
      });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(400).render("login", {
        csrfToken: req.csrfToken(),
        error: "Incorrect password. Please try again.",
      });
    }

    // ✅ If everything is fine, set session
    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    res.redirect("/user/dashboard");
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).render("login", {
      csrfToken: req.csrfToken(),
      error: "Something went wrong. Please try again later.",
    });
  }
});

// Logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});

module.exports = router;
