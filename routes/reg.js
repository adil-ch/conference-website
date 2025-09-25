const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");

const Registration = require("../models/Registration");

// Ensure receipts directory exists
const receiptsDir = path.join(__dirname, "../public/receipts");
if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir, { recursive: true });
}

// Multer setup for PDF uploads with custom naming
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/uploads"));
  },
  filename: function (req, file, cb) {
    // Get form data from request body
    const paperId = req.body.paperId || "0";
    const firstName = req.body.firstName || "user";
    const lastName = req.body.lastName || "";
    const transactionNo = req.body.transactionNo || "NA";

    // Create a clean name by removing spaces and special characters
    const cleanFirstName = firstName.replace(/[^a-zA-Z0-9]/g, "");
    const cleanLastName = lastName.replace(/[^a-zA-Z0-9]/g, "");
    const cleanTransactionNo = transactionNo.replace(/[^a-zA-Z0-9]/g, "");
    const cleanPaperId = paperId.replace(/[^a-zA-Z0-9]/g, "");

    // Combine names
    const fullName = cleanLastName
      ? `${cleanFirstName}_${cleanLastName}`
      : cleanFirstName;

    // Determine file type based on field name
    let prefix = "";
    if (file.fieldname === "paymentProof") {
      prefix = "payment_";
    } else if (file.fieldname === "studentIdCard") {
      prefix = "student_";
    }

    // Create filename: prefix + paper_id + name + transaction_id + .pdf
    const filename = `${prefix}${cleanPaperId}_${fullName}_${cleanTransactionNo}.pdf`;

    cb(null, filename);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

// Function to generate PDF receipt
function generatePDFReceipt(registrationData, callback) {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
  });

  const cleanFirstName = registrationData.firstName.replace(
    /[^a-zA-Z0-9]/g,
    ""
  );
  const cleanLastName = registrationData.lastName.replace(/[^a-zA-Z0-9]/g, "");
  const cleanTransactionNo = registrationData.transactionNo.replace(
    /[^a-zA-Z0-9]/g,
    ""
  );
  const cleanPaperId = registrationData.paperId.replace(/[^a-zA-Z0-9]/g, "");

  const fullName = cleanLastName
    ? `${cleanFirstName}_${cleanLastName}`
    : cleanFirstName;
  const receiptFilename = `receipt_${cleanPaperId}_${fullName}_${cleanTransactionNo}.pdf`;
  const receiptPath = path.join(receiptsDir, receiptFilename);

  doc.pipe(fs.createWriteStream(receiptPath));

  // ---------- HEADER ----------
  try {
    doc.image(path.join(__dirname, "../public/images/iitplogo.png"), 60, 40, {
      fit: [80, 80],
    });
  } catch (err) {
    console.error("Logo not found:", err.message);
  }

  doc
    .fontSize(22)
    .fillColor("#2c5aa0")
    .text("Conference Registration Receipt", 150, 60, { align: "center" })
    .moveDown(2);

  // Receipt info line
  doc
    .fontSize(10)
    .fillColor("#555555")
    .text(`Receipt Generated: ${new Date().toLocaleString("en-IN")}`, {
      align: "right",
    })
    .moveDown(1);

  // Horizontal line
  doc
    .strokeColor("#2c5aa0")
    .lineWidth(1.5)
    .moveTo(50, doc.y)
    .lineTo(550, doc.y)
    .stroke()
    .moveDown(1.5);

  // ---------- SECTION HELPER ----------
  function drawSection(title, info) {
    doc
      .fontSize(13)
      .fillColor("#2c5aa0")
      .text(title, { underline: true })
      .moveDown(0.5);

    doc.fontSize(10).fillColor("#000000");

    info.forEach(([label, value]) => {
      doc
        .font("Helvetica-Bold")
        .text(label, { continued: true, width: 150 })
        .font("Helvetica")
        .text(value)
        .moveDown(0.3);
    });

    doc.moveDown(1);
  }

  // ---------- PERSONAL INFORMATION ----------
  drawSection("Personal Information", [
    [
      "Name:",
      `${registrationData.salutation} ${registrationData.firstName} ${registrationData.lastName}`,
    ],
    ["Email:", registrationData.email],
    ["Gender:", registrationData.gender],
    ["Year of Birth:", registrationData.yearOfBirth.toString()],
    ["Mobile:", registrationData.mobile],
    ["WhatsApp:", registrationData.whatsapp || "Not provided"],
    ["Affiliation:", registrationData.affiliation],
    ["Country:", registrationData.country],
    [
      "Nationality:",
      registrationData.nationality === "national"
        ? "National"
        : "International",
    ],
  ]);

  // ---------- REGISTRATION DETAILS ----------
  drawSection("Registration Details", [
    ["Author:", registrationData.isAuthor ? "Yes" : "No"],
    ["Student:", registrationData.isStudent ? "Yes" : "No"],
    ["Membership:", registrationData.category],
    ["IEEE Number:", registrationData.ieeeNumber || "Not provided"],
    [
      "Conference Type:",
      registrationData.conferenceType === "full"
        ? "Full Conference"
        : "Tutorial/Workshop Only",
    ],
    ["Paper ID:", registrationData.paperId],
    ["Summary:", registrationData.summary],
  ]);

  // ---------- PAYMENT DETAILS ----------
  drawSection("Payment Details", [
    ["Transaction Number:", registrationData.transactionNo],
    ["Payment Date:", registrationData.paymentDate.toLocaleDateString("en-IN")],
    [
      "Fee Amount:",
      `${registrationData.nationality === "international" ? "USD" : "INR"} ${
        registrationData.fee
      } (incl. GST)`,
    ],
    ["Payment Status:", "Submitted (Pending Verification)"],
  ]);

  if (registrationData.comment) {
    doc
      .font("Helvetica-Bold")
      .text("Comment:", { continued: true, width: 150 })
      .font("Helvetica")
      .text(registrationData.comment)
      .moveDown(1);
  }

  // ---------- FOOTER ----------
  doc.moveDown(2);
  doc
    .strokeColor("#cccccc")
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(550, doc.y)
    .stroke()
    .moveDown(0.5);

  doc
    .fontSize(9)
    .fillColor("#666666")
    .text(
      "This is an auto-generated receipt. Please keep it for your records.",
      { align: "center" }
    )
    .moveDown(0.3)
    .text("For any queries, please contact the conference organizers.", {
      align: "center",
    });

  doc.end();

  callback(null, `/receipts/${receiptFilename}`);
}

// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
  if (!req.session.user) return res.redirect("/auth/login");
  next();
}

//Cancel reg
router.post("/cancel/:id", async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.id);
    if (!reg) return res.status(404).json({ error: "Registration not found" });

    // Only cancel if still active
    if (reg.status !== "active") {
      return res.status(400).json({ error: "Registration already cancelled" });
    }

    reg.status = "cancelled";
    await reg.save();

    res.json({ success: true });
  } catch (err) {
    console.error("Cancel error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET registration form
router.get("/form", isLoggedIn, (req, res) => {
  res.render("register-form", { user: req.session.user });
});

// POST registration completion
router.post(
  "/complete",
  isLoggedIn,
  upload.fields([
    { name: "paymentProof", maxCount: 1 },
    { name: "studentIdCard", maxCount: 1 }, // optional
  ]),
  async (req, res) => {
    try {
      let {
        salutation,
        firstName,
        lastName,
        email,
        gender,
        yearOfBirth,
        primaryAffiliation,
        country,
        isStudent,
        mobile,
        whatsapp,
        ieeeNumber,
        isAuthor,
        nationality,
        category,
        conferenceType,
        paperId,
        fee,
        transactionNo,
        dateOfPayment, // string from form
        comment,
        summary,
      } = req.body;

      const authorFlag = isAuthor === "yes";
      const studentFlag = isStudent === "yes";

      // Paper ID handling
      if (!authorFlag) {
        paperId = "0";
        conferenceType = conferenceType === "tutorial" ? "tutorial" : "full";
      }

      if (!dateOfPayment) {
        return res.status(400).send("Payment date is required");
      }

      const paymentDateObj = new Date(dateOfPayment + "T00:00:00");
      if (isNaN(paymentDateObj.getTime())) {
        return res.status(400).send("Invalid payment date");
      }

      const registrationData = {
        user: req.session.user.id,
        salutation,
        firstName,
        lastName,
        email,
        gender,
        yearOfBirth: Number(yearOfBirth),
        affiliation: primaryAffiliation, // matches schema
        country,
        isStudent: studentFlag,
        studentIdCardPath:
          studentFlag && req.files["studentIdCard"]
            ? `/uploads/${req.files["studentIdCard"][0].filename}`
            : null, // matches schema
        mobile,
        whatsapp,
        ieeeNumber,
        isAuthor: authorFlag,
        nationality,
        category,
        conferenceType,
        paperId,
        registrationDate: new Date(),
        fee: fee ? Number(fee) : 0,
        transactionNo,
        pdfPath: req.files["paymentProof"]
          ? `/uploads/${req.files["paymentProof"][0].filename}`
          : null,
        paymentDate: paymentDateObj,
        comment,
        summary,
        status: "active",  
      };

      // Generate PDF receipt
      generatePDFReceipt(registrationData, async (err, receiptPath) => {
        if (err) {
          console.error("Error generating PDF receipt:", err);
          return res
            .status(500)
            .send("Error generating receipt: " + err.message);
        }

        // Add receipt path to registration data
        registrationData.receiptPath = receiptPath;

        try {
          const registration = new Registration(registrationData);
          await registration.save();

          res.render("receipt", {
            registration,
            user: req.session.user,
            receiptDownloadUrl: receiptPath,
          });
        } catch (saveErr) {
          console.error("Error saving registration:", saveErr);
          res.status(500).send("Error saving registration: " + saveErr.message);
        }
      });
    } catch (err) {
      console.error("Error processing registration:", err);
      res.status(500).send("Error processing registration: " + err.message);
    }
  }
);

module.exports = router;
