const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
  {
    salutation: {
      type: String,
      enum: ["Prof.", "Dr.", "Mr.", "Ms."],
      required: true,
    },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true }, // ✅ add this
    gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
    yearOfBirth: { type: Number, required: true },
    affiliation: { type: String, required: true },
    country: { type: String, required: true },
    isStudent: { type: Boolean, required: true },
    studentIdCardPath: { type: String }, // optional PDF
    mobile: { type: String, required: true },
    whatsapp: { type: String },
    ieeeNumber: { type: String },
    paymentDate: { type: Date, required: true },
    comment: { type: String },

    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isAuthor: { type: Boolean, required: true },
    nationality: {
      type: String,
      enum: ["national", "international"],
      required: true,
    },
    category: {
      type: String,
      enum: [
        "IEEE Member",
        "Non-member",
        "IEEE Student Member",
        "Student Non-member",
      ],
      required: true,
    },
    conferenceType: {
      type: String,
      enum: ["full", "tutorial"],
      required: true,
    },
    paperId: { type: String, default: "0" },
    registrationDate: { type: Date, default: Date.now },
    fee: { type: Number, required: true },
    transactionNo: { type: String, required: true },
    pdfPath: { type: String }, // for payment proof
    //summary string
    summary: { type: String },
    // ✅ NEW FIELD for PDF receipt
    receiptPath: { type: String }, // for generated PDF receipt
    // ✅ OPTIONAL: Status field for tracking registration status
    status: {
      type: String,
      enum: ["active", "cancelled"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Registration", registrationSchema);
