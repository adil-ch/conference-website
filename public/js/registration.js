// public/js/registration.js

// Early-bird deadline
const earlyBirdDeadline = new Date("2025-10-26T23:59:59");

// Base fee table (without GST)
const baseFees = {
  yes: {
    // Authors
    national: {
      "IEEE Member": 12000,
      "Non-member": 14000,
      "IEEE Student Member": 8000,
      "Student Non-member": 10000,
    },
    international: {
      "IEEE Member": 350,
      "Non-member": 400,
      "IEEE Student Member": 250,
      "Student Non-member": 300,
    },
  },
  no: {
    // Non-authors
    national: {
      "IEEE Member": {
        full: { early: 7000, late: 8000 },
        tutorial: { early: 2500, late: 3000 },
      },
      "Non-member": {
        full: { early: 8000, late: 9000 },
        tutorial: { early: 3000, late: 3500 },
      },
      "IEEE Student Member": {
        full: { early: 4500, late: 5500 },
        tutorial: { early: 1500, late: 2000 },
      },
      "Student Non-member": {
        full: { early: 5500, late: 6500 },
        tutorial: { early: 2000, late: 2500 },
      },
    },
    international: {
      "IEEE Member": {
        full: { early: 250, late: 300 },
        tutorial: { early: 0, late: 0 },
      },
      "Non-member": {
        full: { early: 300, late: 350 },
        tutorial: { early: 0, late: 0 },
      },
      "IEEE Student Member": {
        full: { early: 150, late: 200 },
        tutorial: { early: 0, late: 0 },
      },
      "Student Non-member": {
        full: { early: 200, late: 250 },
        tutorial: { early: 0, late: 0 },
      },
    },
  },
};

function calculateSummary() {
  const isAuthor = document.querySelector(
    "input[name='isAuthor']:checked"
  )?.value;
  const nationality = document.querySelector(
    "input[name='nationality']:checked"
  )?.value;
  const category = document.querySelector("select[name='category']")?.value;
  const confType = document.querySelector("#conferenceType")?.value;
  const paperId = document.querySelector("#paperId")?.value || "0";
  const transactionNo = document.querySelector("#transactionNo")?.value || "NA";

  if (!isAuthor || !nationality || !category || !confType) {
    document.querySelector("#summaryDisplay").textContent = "--";
    document.querySelector("#summaryInput").value = "";
    return;
  }

  // Early/late logic
  const today = new Date();
  const phase = today <= earlyBirdDeadline ? "early_bid" : "regular";

  // Build string
  const summary = [
    `paper_${paperId}`,
    isAuthor === "yes" ? "Author" : "Non_author",
    nationality,
    category.replace(/\s+/g, "_"),
    confType === "full" ? "Full_conference" : "Tutorial_only",
    // `txn_${transactionNo}`,
    // phase,
  ].join("-");

  // Update UI + hidden field
  document.querySelector("#summaryDisplay").textContent = summary;
  document.querySelector("#summaryInput").value = summary;
}

// Handle Author/Non-author toggle
function handleAuthorChange() {
  const isAuthor = document.querySelector(
    'input[name="isAuthor"]:checked'
  )?.value;
  const conferenceSelect = document.getElementById("conferenceType");
  const paperIdInput = document.getElementById("paperId");

  if (isAuthor === "yes") {
    // Authors: always full, need paper ID
    if (conferenceSelect) {
      conferenceSelect.value = "full";
      const tutorialOption = conferenceSelect.querySelector(
        'option[value="tutorial"]'
      );
      if (tutorialOption) tutorialOption.disabled = true;
    }
    if (paperIdInput) {
      paperIdInput.value = "";
      paperIdInput.disabled = false;
      paperIdInput.required = true; // ✅ make mandatory
    }
  } else {
    // Non-authors: can choose, paper ID fixed to 0
    if (conferenceSelect) {
      const tutorialOption = conferenceSelect.querySelector(
        'option[value="tutorial"]'
      );
      if (tutorialOption) tutorialOption.disabled = false;
    }
    if (paperIdInput) {
      paperIdInput.value = "0";
      paperIdInput.disabled = true;
      paperIdInput.required = false; // ✅ not mandatory
    }
  }

  calculateFee(); // update fee when switching
}

// Fee calculation
function calculateFee() {
  const isAuthor = document.querySelector(
    "input[name='isAuthor']:checked"
  )?.value;
  const nationality = document.querySelector(
    "input[name='nationality']:checked"
  )?.value;
  const category = document.querySelector("select[name='category']")?.value;
  const confType = document.querySelector("#conferenceType")?.value;

  const feeDisplay = document.querySelector("#feeDisplay");
  const feeInput = document.querySelector("#feeInput");

  if (!isAuthor || !nationality || !category || !confType) {
    feeDisplay.textContent = "--";
    feeInput.value = "";
    return;
  }

  try {
    let baseFee;

    if (isAuthor === "yes") {
      // Authors: fixed fee, no early/late
      baseFee = baseFees.yes[nationality][category];
    } else {
      // Non-authors: early/late logic
      const today = new Date();
      const phase = today <= earlyBirdDeadline ? "early" : "late";
      baseFee = baseFees.no[nationality][category][confType][phase];
    }

    // Apply 18% GST
    const finalFee = Math.round(baseFee * 1.18);

    // Decide currency
    const currency = nationality === "international" ? "USD" : "INR";

    // Update UI
    if (nationality === "international") {
      const inrEquivalent = Math.round(finalFee * 89);
      feeDisplay.textContent = `USD ${finalFee} (incl. GST) ≈ INR ${inrEquivalent}`;
    } else {
      feeDisplay.textContent = `INR ${finalFee} (incl. GST)`;
    }
    feeInput.value = finalFee;
  } catch (err) {
    console.error("Fee calculation error:", err);
    feeDisplay.textContent = "--";
    feeInput.value = "";
  }
}

// Attach listeners
document.addEventListener("DOMContentLoaded", () => {
  // Author logic
  handleAuthorChange();
  document.querySelectorAll('input[name="isAuthor"]').forEach((el) => {
    el.addEventListener("change", handleAuthorChange);
  });

  // Fee calc triggers and summary
  document.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("change", () => {
      calculateFee();
      calculateSummary();
    });
  });

  document
    .querySelector("#transactionNo")
    ?.addEventListener("input", calculateSummary);

  // Initial calculation
  calculateFee();
  calculateSummary();
});

const studentRadios = document.getElementsByName("isStudent");
const studentDiv = document.getElementById("studentIdDiv");

studentRadios.forEach((r) =>
  r.addEventListener("change", () => {
    if (
      document.querySelector('input[name="isStudent"]:checked').value === "yes"
    ) {
      studentDiv.style.display = "block";
    } else {
      studentDiv.style.display = "none";
    }
  })
);
