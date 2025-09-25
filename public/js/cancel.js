
document.addEventListener("DOMContentLoaded", () => {
  // Cancel buttons
  const cancelButtons = document.querySelectorAll(".cancel-btn");
  cancelButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const regId = btn.dataset.id;
      if (!confirm("Are you sure you want to cancel this registration?")) return;

      try {
        const response = await fetch(`/register/cancel/${regId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
          alert("Registration cancelled successfully.");
          location.reload();
        } else {
          const error = await response.json();
          alert(error.error || "Failed to cancel registration.");
        }
      } catch (err) {
        console.error("Cancel error:", err);
        alert("Something went wrong.");
      }
    });
  });
});
