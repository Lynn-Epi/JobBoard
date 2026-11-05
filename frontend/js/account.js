async function loadAccount() {
  try {
    const response = await fetch("/me");

    if (!response.ok) {
      window.location.href = "signIn.html";
      return;
    }

    const user = await response.json();

    document.getElementById("first_name").textContent = user.first_name;
    document.getElementById("last_name").textContent = user.last_name;
    document.getElementById("email").textContent = user.email;
    document.getElementById("phone_number").textContent =
      user.phone_number || "Not provided";
    document.getElementById("cv_url").textContent =
      user.cv_url || "Not provided";
  } catch (error) {
    console.error(error);
  }
}
const dialog = document.getElementById("edit-dialog");
const editForm = document.getElementById("edit-form");
const editInput = document.getElementById("edit-input");
const editTitle = document.getElementById("edit-title");
const cancelButton = document.getElementById("cancel-button");
const formMessage = document.getElementById("form-message");

let currentField = "";

document.querySelectorAll("[data-field]").forEach((button) => {
  button.addEventListener("click", () => {
    currentField = button.dataset.field;

    const currentValue = document.getElementById(currentField).textContent;

    editTitle.textContent = "Change " + currentField.replaceAll("_", " ");
    editInput.value = currentValue === "Not provided" ? "" : currentValue;
    editInput.type =
      currentField === "email"
        ? "email"
        : currentField === "cv_url"
          ? "url"
          : "text";

    dialog.showModal();
  });
});

cancelButton.addEventListener("click", () => {
  dialog.close();
});

editForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const response = await fetch("/me", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        [currentField]: editInput.value.trim(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      formMessage.textContent = data.error || "Failed to update account";
      dialog.close();
      return;
    }

    document.getElementById(currentField).textContent =
      data[currentField] || "Not provided";

    formMessage.textContent = "";
    dialog.close();
  } catch (error) {
    console.error(error);
    formMessage.textContent = "Could not update account";
    dialog.close();
  }
});

loadAccount();

const logoutButton = document.getElementById("logout-button");

logoutButton.addEventListener("click", async () => {
  try {
    const response = await fetch("/logout", {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Failed to log out");
    }

    window.location.href = "signIn.html";
  } catch (error) {
    console.error(error);
  }
});
