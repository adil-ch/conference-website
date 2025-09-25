const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

const User = require("../models/User");
const Registration = require("../models/Registration");

const ExcelJS = require("exceljs");

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

router.get("/download-registrations", isAdmin, async (req, res) => {
  try {
    const registrations = await Registration.find().populate("user");

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Registrations");

    // Add header row
    worksheet.columns = [
      { header: "Name", key: "name", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "Author", key: "author", width: 10 },
      { header: "Nationality", key: "nationality", width: 15 },
      { header: "Category", key: "category", width: 15 },
      { header: "Conference Type", key: "conferenceType", width: 25 },
      { header: "Paper ID", key: "paperId", width: 15 },
      { header: "Fee", key: "fee", width: 15 },
      { header: "Transaction No.", key: "transactionNo", width: 20 },
      { header: "Registration Date", key: "registrationDate", width: 20 },
      { header: "Status", key: "status", width: 10 },
    ];

    // Add rows
    registrations.forEach((reg) => {
      worksheet.addRow({
        name: reg.user.name,
        email: reg.user.email,
        author: reg.isAuthor ? "Yes" : "No",
        nationality: reg.nationality,
        category: reg.category,
        conferenceType:
          reg.conferenceType === "full"
            ? "Full Conference including Tutorials/Workshops"
            : "Only Tutorial/Workshop",
        paperId: reg.paperId || "",
        fee:
          reg.nationality === "international"
            ? `$${reg.fee} (≈ ₹${reg.fee * 88})`
            : `₹${reg.fee}`,
        transactionNo: reg.transactionNo || "",
        registrationDate: new Date(reg.registrationDate).toLocaleString(),
        status: reg.status === "cancelled" ? "Cancelled" : "Active",
      });
    });

    // Send the file as a download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=registrations.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
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
