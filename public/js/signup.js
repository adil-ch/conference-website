document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    const pw = document.getElementById("password").value;
    const cpw = document.getElementById("confirmPassword").value;

    if (pw !== cpw) {
      e.preventDefault();
      alert("Passwords do not match!");
    }
  });
});