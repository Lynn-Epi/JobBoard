const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const formMessage = document.getElementById("form-message");

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    formMessage.textContent = "";

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        formMessage.textContent = data.error || "Login failed";
        return;
      }

      if (data.user.role === "admin") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "index.html";
      }
    } catch (error) {
      console.error(error);
      formMessage.textContent = "Could not connect to the server";
    }
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const first_name = document.getElementById("first_name").value.trim();
    const last_name = document.getElementById("last_name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirm_password = document.getElementById("confirm_password").value;

    formMessage.textContent = "";

    if (password !== confirm_password) {
      formMessage.textContent = "Passwords do not match";
      return;
    }

    try {
      const response = await fetch("/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          first_name,
          last_name,
          email,
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        formMessage.textContent = data.error || "Registration failed";
        return;
      }

      window.location.href = "signIn.html";
    } catch (error) {
      console.error(error);
      formMessage.textContent = "Could not connect to the server";
    }
  });
}