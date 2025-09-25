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
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

// Function to generate PDF receipt
function generatePDFReceiptBuffer(registrationData) {
  return new Promise((resolve, reject) => {
    const PDFDocument = require("pdfkit");
    const path = require("path");
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    const cleanFirstName = registrationData.firstName.replace(
      /[^a-zA-Z0-9]/g,
      ""
    );
    const cleanLastName = registrationData.lastName.replace(
      /[^a-zA-Z0-9]/g,
      ""
    );
    const cleanTransactionNo = registrationData.transactionNo.replace(
      /[^a-zA-Z0-9]/g,
      ""
    );
    const cleanPaperId = registrationData.paperId.replace(/[^a-zA-Z0-9]/g, "");

    const fullName = cleanLastName
      ? `${cleanFirstName}_${cleanLastName}`
      : cleanFirstName;

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

    doc
      .fontSize(10)
      .fillColor("#555555")
      .text(`Receipt Generated: ${new Date().toLocaleString("en-IN")}`, {
        align: "right",
      })
      .moveDown(1);

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

    const paymentDateText = registrationData.paymentDate
      ? registrationData.paymentDate.toLocaleDateString("en-IN")
      : "Not provided";

    drawSection("Payment Details", [
      ["Transaction Number:", registrationData.transactionNo],
      ["Payment Date:", paymentDateText],
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
  });
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
        dateOfPayment,
        comment,
        summary,
      } = req.body;

      const authorFlag = isAuthor === "yes";
      const studentFlag = isStudent === "yes";

      if (!authorFlag) {
        paperId = "0";
        conferenceType = conferenceType === "tutorial" ? "tutorial" : "full";
      }

      if (!dateOfPayment)
        return res.status(400).send("Payment date is required");

      const paymentDateObj = new Date(dateOfPayment + "T00:00:00");
      if (isNaN(paymentDateObj.getTime()))
        return res.status(400).send("Invalid payment date");

      const registrationData = {
        user: req.session.user.id,
        salutation,
        firstName,
        lastName,
        email,
        gender,
        yearOfBirth: Number(yearOfBirth),
        affiliation: primaryAffiliation,
        country,
        isStudent: studentFlag,
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
        comment,
        summary,
        status: "active",
        paymentDate: paymentDateObj,
      };

      // ---------- Upload paymentProof to S3 ----------
      if (req.files["paymentProof"]) {
        const file = req.files["paymentProof"][0];
        const s3FileName = `payments/${Date.now()}_${file.originalname}`;
        const s3Result = await require("../utils/s3").uploadFileToS3(
          file.buffer,
          s3FileName,
          file.mimetype
        );
        registrationData.paymentProofS3Url = s3Result.Location;
      }

      // ---------- Upload studentIdCard to S3 ----------
      if (studentFlag && req.files["studentIdCard"]) {
        const file = req.files["studentIdCard"][0];
        const s3FileName = `studentIdCards/${Date.now()}_${file.originalname}`;
        const s3Result = await require("../utils/s3").uploadFileToS3(
          file.buffer,
          s3FileName,
          file.mimetype
        );
        registrationData.studentIdCardS3Url = s3Result.Location;
      }

      // ---------- Generate PDF receipt and upload to S3 ----------
      const pdfBuffer = await generatePDFReceiptBuffer(registrationData);
      const receiptFileName = `receipts/receipt_${Date.now()}.pdf`;
      const s3ResultReceipt = await require("../utils/s3").uploadFileToS3(
        pdfBuffer,
        receiptFileName,
        "application/pdf"
      );
      registrationData.receiptPath = s3ResultReceipt.Location;

      // ---------- Save registration to DB ----------
      const registration = new Registration(registrationData);
      await registration.save();

      res.render("receipt", {
        registration,
        user: req.session.user,
        receiptDownloadUrl:
          registration.receiptPath || registration.receiptS3Url,
      });
    } catch (err) {
      console.error("Error processing registration:", err);
      res.status(500).send("Error processing registration: " + err.message);
    }
  }
);

module.exports = router;
