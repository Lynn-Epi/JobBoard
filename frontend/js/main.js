const jobContainer = document.getElementById("job-container");
const jobsSection = document.getElementById("jobs");
const detailsSection = document.getElementById("job-details");
const applicationForm = document.getElementById("application-form");

let selectedJobId = null;

async function loadJobs() {
  try {
    const response = await fetch("/ads");

    if (!response.ok) {
      throw new Error("Failed to load jobs");
    }

    const jobs = await response.json();
    jobContainer.innerHTML = "";

    jobs.forEach((job) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "job-card";

      const title = document.createElement("h3");
      title.className = "job-title";
      title.textContent = job.job_title;

      const company = document.createElement("p");
      company.className = "job-company";
      company.textContent = job.company_name;

      const location = document.createElement("p");
      location.className = "job-location";
      location.textContent = job.location || "Not specified";

      const description = document.createElement("p");
      description.className = "job-description";
      description.textContent = job.description;

      card.append(title, company, location, description);

      card.addEventListener("click", () => {
        showJob(job.id);
      });

      jobContainer.appendChild(card);
    });
  } catch (error) {
    console.error(error);
  }
}

async function showJob(id) {
  try {
    const response = await fetch(`/ads/${id}`);

    if (!response.ok) {
      throw new Error("Failed to load job details");
    }

    const job = await response.json();
    selectedJobId = job.id;

    document.getElementById("detail-title").textContent = job.job_title;
    document.getElementById("detail-company").textContent = job.company_name;
    document.getElementById("detail-description").textContent = job.description;
    document.getElementById("detail-location").textContent =
      job.location || "Not specified";
    document.getElementById("detail-salary").textContent =
      job.salary ?? "Not specified";
    document.getElementById("detail-hours").textContent =
      job.weekly_hours ?? "Not specified";

    jobsSection.hidden = true;
    detailsSection.hidden = false;
    applicationForm.hidden = true;
  } catch (error) {
    console.error(error);
  }
}

document.getElementById("back-button").addEventListener("click", () => {
  detailsSection.hidden = true;
  jobsSection.hidden = false;
  applicationForm.hidden = true;
});

const guestFields = document.getElementById("guest-fields");
let isLoggedIn = false;

document.getElementById("apply-button").addEventListener("click", async () => {
  applicationForm.hidden = false;
  applicationForm.reset();

  document.getElementById("application-feedback").textContent = "";

  try {
    const response = await fetch("/me");

    isLoggedIn = response.ok;
    guestFields.hidden = isLoggedIn;

    document.getElementById("apply-first-name").required = !isLoggedIn;
    document.getElementById("apply-last-name").required = !isLoggedIn;
    document.getElementById("apply-email").required = !isLoggedIn;
  } catch (error) {
    console.error(error);
    isLoggedIn = false;
    guestFields.hidden = false;
  }
});

applicationForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const feedback = document.getElementById("application-feedback");

  const application = {
    application_message: document.getElementById("apply-message").value.trim(),
  };

  if (!isLoggedIn) {
    application.first_name = document
      .getElementById("apply-first-name")
      .value.trim();
    application.last_name = document
      .getElementById("apply-last-name")
      .value.trim();
    application.email = document.getElementById("apply-email").value.trim();
    application.phone_number = document
      .getElementById("apply-phone")
      .value.trim();
  }

  try {
    const response = await fetch(`/ads/${selectedJobId}/applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(application),
    });

    const data = await response.json();

    if (!response.ok) {
      feedback.textContent = data.error || "Application failed";
      return;
    }

    feedback.textContent = "Application submitted successfully";
    applicationForm.reset();
  } catch (error) {
    console.error(error);
    feedback.textContent = "Could not submit application";
  }
});

loadJobs();
