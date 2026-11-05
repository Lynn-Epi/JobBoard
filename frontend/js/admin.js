const adminMain = document.querySelector(".admin-main");

const jobForm = document.getElementById("job-form");
const jobsTable = document.getElementById("jobs-table");
const adminMessage = document.getElementById("admin-message");
const cancelEditButton = document.getElementById("cancel-edit");

const companyForm = document.getElementById("company-form");
const companiesTable = document.getElementById("companies-table");
const companyMessage = document.getElementById("company-message");

const categoryForm = document.getElementById("category-form");
const categoriesTable = document.getElementById("categories-table");
const categoryMessage = document.getElementById("category-message");

let jobs = [];
let companies = [];
let categories = [];

async function loadAdmin() {
  try {
    const response = await fetch("/me");

    if (!response.ok) {
      window.location.href = "signIn.html";
      return;
    }

    const user = await response.json();

    if (user.role !== "admin") {
      window.location.href = "index.html";
      return;
    }

    adminMain.hidden = false;

    await loadCompanies();
    await loadCategories();
    await loadJobs();
    await loadPeople();
    await loadApplications();
  } catch (error) {
    console.error(error);
    adminMessage.textContent = "Failed to load dashboard";
  }
}

document.querySelectorAll(".admin-navigation button").forEach((button) => {
  button.addEventListener("click", () => {
    document.getElementById("jobs-management").hidden = true;
    document.getElementById("companies-management").hidden = true;
    document.getElementById("categories-management").hidden = true;
    document.getElementById("people-management").hidden = true;
    document.getElementById("applications-management").hidden = true;

    document.getElementById(button.dataset.section).hidden = false;
  });
});

async function loadCompanies() {
  const response = await fetch("/companies");

  if (!response.ok) {
    throw new Error("Failed to load companies");
  }

  companies = await response.json();

  const select = document.getElementById("job-company");
  select.innerHTML = "";
  companiesTable.innerHTML = "";

  companies.forEach((company) => {
    const option = document.createElement("option");
    option.value = company.id;
    option.textContent = company.name;
    select.appendChild(option);

    const row = document.createElement("tr");

    const idCell = document.createElement("td");
    idCell.textContent = company.id;

    const nameCell = document.createElement("td");
    nameCell.textContent = company.name;

    const industryCell = document.createElement("td");
    industryCell.textContent = company.industry || "Not specified";

    const actionsCell = document.createElement("td");

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => editCompany(company.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteCompany(company.id));

    actionsCell.append(editButton, " ", deleteButton);
    row.append(idCell, nameCell, industryCell, actionsCell);
    companiesTable.appendChild(row);
  });
}

async function loadCategories() {
  const response = await fetch("/categories");

  if (!response.ok) {
    throw new Error("Failed to load categories");
  }

  categories = await response.json();

  const select = document.getElementById("job-category");
  select.innerHTML = "";
  categoriesTable.innerHTML = "";

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    select.appendChild(option);

    const row = document.createElement("tr");

    const idCell = document.createElement("td");
    idCell.textContent = category.id;

    const nameCell = document.createElement("td");
    nameCell.textContent = category.name;

    const actionsCell = document.createElement("td");

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => editCategory(category.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteCategory(category.id));

    actionsCell.append(editButton, " ", deleteButton);
    row.append(idCell, nameCell, actionsCell);
    categoriesTable.appendChild(row);
  });
}

async function loadJobs() {
  const response = await fetch("/admin/advertisements");

  if (!response.ok) {
    throw new Error("Failed to load jobs");
  }

  jobs = await response.json();
  jobsTable.innerHTML = "";

  jobs.forEach((job) => {
    const row = document.createElement("tr");

    const idCell = document.createElement("td");
    idCell.textContent = job.id;

    const titleCell = document.createElement("td");
    titleCell.textContent = job.job_title;

    const companyCell = document.createElement("td");
    const company = companies.find((item) => item.id === job.company_id);
    companyCell.textContent = company ? company.name : job.company_id;

    const locationCell = document.createElement("td");
    locationCell.textContent = job.location || "Not specified";

    const actionsCell = document.createElement("td");

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => editJob(job.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteJob(job.id));

    actionsCell.append(editButton, " ", deleteButton);
    row.append(idCell, titleCell, companyCell, locationCell, actionsCell);
    jobsTable.appendChild(row);
  });
}

function editJob(id) {
  const job = jobs.find((item) => item.id === id);
  if (!job) return;

  document.getElementById("job-id").value = job.id;
  document.getElementById("job-title").value = job.job_title;
  document.getElementById("job-description").value = job.description;
  document.getElementById("job-company").value = job.company_id;
  document.getElementById("job-category").value = job.category_id;
  document.getElementById("job-location").value = job.location || "";
  document.getElementById("job-salary").value = job.salary ?? "";
  document.getElementById("job-hours").value = job.weekly_hours ?? "";

  document.getElementById("save-job").textContent = "Save Changes";
  cancelEditButton.hidden = false;

  jobForm.scrollIntoView();
}

function resetJobForm() {
  jobForm.reset();
  document.getElementById("job-id").value = "";
  document.getElementById("save-job").textContent = "Add Job";
  cancelEditButton.hidden = true;
}

cancelEditButton.addEventListener("click", resetJobForm);

jobForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = document.getElementById("job-id").value;

  const job = {
    job_title: document.getElementById("job-title").value.trim(),
    description: document.getElementById("job-description").value.trim(),
    company_id: Number(document.getElementById("job-company").value),
    category_id: Number(document.getElementById("job-category").value),
    location: document.getElementById("job-location").value.trim() || null,
    salary: document.getElementById("job-salary").value
      ? Number(document.getElementById("job-salary").value)
      : null,
    weekly_hours: document.getElementById("job-hours").value
      ? Number(document.getElementById("job-hours").value)
      : null,
  };

  try {
    const response = await fetch(id ? `/ads/${id}` : "/ads", {
      method: id ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(job),
    });

    const data = await response.json();

    if (!response.ok) {
      adminMessage.textContent = data.error || "Failed to save job";
      return;
    }

    adminMessage.textContent = id ? "Job updated" : "Job added";
    resetJobForm();
    await loadJobs();
  } catch (error) {
    console.error(error);
    adminMessage.textContent = "Could not save job";
  }
});

async function deleteJob(id) {
  if (!confirm("Are you sure you want to delete this job?")) return;

  try {
    const response = await fetch(`/ads/${id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      adminMessage.textContent = data.error || "Failed to delete job";
      return;
    }

    adminMessage.textContent = "Job deleted";
    await loadJobs();
  } catch (error) {
    console.error(error);
    adminMessage.textContent = "Could not delete job";
  }
}

function editCompany(id) {
  const company = companies.find((item) => item.id === id);
  if (!company) return;

  document.getElementById("company-id").value = company.id;
  document.getElementById("company-name").value = company.name;
  document.getElementById("company-description").value =
    company.description || "";
  document.getElementById("company-email").value = company.email || "";
  document.getElementById("company-industry").value = company.industry || "";
  document.getElementById("company-location").value = company.location || "";
  document.getElementById("company-website").value = company.website_url || "";

  document.getElementById("save-company").textContent = "Save Changes";
  document.getElementById("cancel-company").hidden = false;

  companyForm.scrollIntoView();
}

function resetCompanyForm() {
  companyForm.reset();
  document.getElementById("company-id").value = "";
  document.getElementById("save-company").textContent = "Add Company";
  document.getElementById("cancel-company").hidden = true;
}

document
  .getElementById("cancel-company")
  .addEventListener("click", resetCompanyForm);

companyForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = document.getElementById("company-id").value;

  const company = {
    name: document.getElementById("company-name").value.trim(),
    description:
      document.getElementById("company-description").value.trim() || null,
    email: document.getElementById("company-email").value.trim() || null,
    industry: document.getElementById("company-industry").value.trim() || null,
    location: document.getElementById("company-location").value.trim() || null,
    website_url:
      document.getElementById("company-website").value.trim() || null,
  };

  try {
    const response = await fetch(
      id ? `/admin/companies/${id}` : "/admin/companies",
      {
        method: id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(company),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      companyMessage.textContent = data.error || "Failed to save company";
      return;
    }

    companyMessage.textContent = id ? "Company updated" : "Company added";
    resetCompanyForm();
    await loadCompanies();
    await loadJobs();
  } catch (error) {
    console.error(error);
    companyMessage.textContent = "Could not save company";
  }
});

async function deleteCompany(id) {
  if (!confirm("Are you sure you want to delete this company?")) return;

  try {
    const response = await fetch(`/admin/companies/${id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      companyMessage.textContent = data.error || "Failed to delete company";
      return;
    }

    companyMessage.textContent = "Company deleted";
    await loadCompanies();
    await loadJobs();
  } catch (error) {
    console.error(error);
    companyMessage.textContent = "Could not delete company";
  }
}

function editCategory(id) {
  const category = categories.find((item) => item.id === id);
  if (!category) return;

  document.getElementById("category-id").value = category.id;
  document.getElementById("category-name").value = category.name;

  document.getElementById("save-category").textContent = "Save Changes";
  document.getElementById("cancel-category").hidden = false;

  categoryForm.scrollIntoView();
}

function resetCategoryForm() {
  categoryForm.reset();
  document.getElementById("category-id").value = "";
  document.getElementById("save-category").textContent = "Add Category";
  document.getElementById("cancel-category").hidden = true;
}

document
  .getElementById("cancel-category")
  .addEventListener("click", resetCategoryForm);

categoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = document.getElementById("category-id").value;

  const category = {
    name: document.getElementById("category-name").value.trim(),
  };

  try {
    const response = await fetch(
      id ? `/admin/categories/${id}` : "/admin/categories",
      {
        method: id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(category),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      categoryMessage.textContent = data.error || "Failed to save category";
      return;
    }

    categoryMessage.textContent = id ? "Category updated" : "Category added";
    resetCategoryForm();
    await loadCategories();
  } catch (error) {
    console.error(error);
    categoryMessage.textContent = "Could not save category";
  }
});

async function deleteCategory(id) {
  if (!confirm("Are you sure you want to delete this category?")) return;

  try {
    const response = await fetch(`/admin/categories/${id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      categoryMessage.textContent = data.error || "Failed to delete category";
      return;
    }

    categoryMessage.textContent = "Category deleted";
    await loadCategories();
  } catch (error) {
    console.error(error);
    categoryMessage.textContent = "Could not delete category";
  }
}





const personForm = document.getElementById("person-form");
const peopleTable = document.getElementById("people-table");
const personMessage = document.getElementById("person-message");

const adminApplicationForm = document.getElementById("admin-application-form");
const applicationsTable = document.getElementById("applications-table");
const applicationAdminMessage = document.getElementById("application-admin-message");

let people = [];
let applications = [];

function makeActionButton(label, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", action);
  return button;
}

async function loadPeople() {
  const response = await fetch("/admin/people");
  if (!response.ok) throw new Error("Failed to load people");

  people = await response.json();
  peopleTable.innerHTML = "";

  const applicantSelect = document.getElementById("application-person");
  applicantSelect.innerHTML = "";

  people.forEach((person) => {
    const option = document.createElement("option");
    option.value = person.id;
    option.textContent = `${person.first_name} ${person.last_name}`;
    applicantSelect.appendChild(option);

    const row = document.createElement("tr");

    const idCell = document.createElement("td");
    idCell.textContent = person.id;

    const nameCell = document.createElement("td");
    nameCell.textContent = `${person.first_name} ${person.last_name}`;

    const emailCell = document.createElement("td");
    emailCell.textContent = person.email;

    const roleCell = document.createElement("td");
    roleCell.textContent = person.role;

    const actionsCell = document.createElement("td");
    actionsCell.append(
      makeActionButton("Edit", () => editPerson(person.id)),
      " ",
      makeActionButton("Delete", () => deletePerson(person.id))
    );

    row.append(idCell, nameCell, emailCell, roleCell, actionsCell);
    peopleTable.appendChild(row);
  });
}

function editPerson(id) {
  const person = people.find((item) => item.id === id);
  if (!person) return;

  document.getElementById("person-id").value = person.id;
  document.getElementById("person-first-name").value = person.first_name;
  document.getElementById("person-last-name").value = person.last_name;
  document.getElementById("person-email").value = person.email;
  document.getElementById("person-phone").value = person.phone_number || "";
  document.getElementById("person-cv").value = person.cv_url || "";

  document.getElementById("save-person").textContent = "Save Changes";
  document.getElementById("cancel-person").hidden = false;
  personForm.scrollIntoView();
}

function resetPersonForm() {
  personForm.reset();
  document.getElementById("person-id").value = "";
  document.getElementById("save-person").textContent = "Add Person";
  document.getElementById("cancel-person").hidden = true;
}

document.getElementById("cancel-person").addEventListener("click", resetPersonForm);

personForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = document.getElementById("person-id").value;

  const person = {
    first_name: document.getElementById("person-first-name").value.trim(),
    last_name: document.getElementById("person-last-name").value.trim(),
    email: document.getElementById("person-email").value.trim(),
    phone_number: document.getElementById("person-phone").value.trim() || null,
    cv_url: document.getElementById("person-cv").value.trim() || null
  };

  try {
    const response = await fetch(
      id ? `/admin/people/${id}` : "/admin/people",
      {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(person)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      personMessage.textContent = data.error || "Failed to save person";
      return;
    }

    personMessage.textContent = id ? "Person updated" : "Person added";
    resetPersonForm();
    await loadPeople();
    await loadApplications();
  } catch (error) {
    console.error(error);
    personMessage.textContent = "Could not save person";
  }
});

async function deletePerson(id) {
  if (!confirm("Are you sure you want to delete this person?")) return;

  try {
    const response = await fetch(`/admin/people/${id}`, {
      method: "DELETE"
    });

    const data = await response.json();

    if (!response.ok) {
      personMessage.textContent = data.error || "Failed to delete person";
      return;
    }

    personMessage.textContent = "Person deleted";
    await loadPeople();
  } catch (error) {
    console.error(error);
    personMessage.textContent = "Could not delete person";
  }
}

async function loadApplications() {
  const response = await fetch("/admin/applications");
  if (!response.ok) throw new Error("Failed to load applications");

  applications = await response.json();
  applicationsTable.innerHTML = "";

  const jobSelect = document.getElementById("application-job");
  jobSelect.innerHTML = "";

  jobs.forEach((job) => {
    const option = document.createElement("option");
    option.value = job.id;
    option.textContent = job.job_title;
    jobSelect.appendChild(option);
  });

  applications.forEach((application) => {
    const row = document.createElement("tr");

    const idCell = document.createElement("td");
    idCell.textContent = application.id;

    const applicant = people.find(
      (person) => person.id === application.person_id
    );
    const personCell = document.createElement("td");
    personCell.textContent = applicant
      ? `${applicant.first_name} ${applicant.last_name}`
      : application.person_id;

    const job = jobs.find(
      (item) => item.id === application.advertisement_id
    );
    const jobCell = document.createElement("td");
    jobCell.textContent = job
      ? job.job_title
      : application.advertisement_id;

    const messageCell = document.createElement("td");
    messageCell.textContent = application.application_message;

    const actionsCell = document.createElement("td");
    actionsCell.append(
      makeActionButton("Edit", () => editApplication(application.id)),
      " ",
      makeActionButton("Delete", () => deleteApplication(application.id))
    );

    row.append(idCell, personCell, jobCell, messageCell, actionsCell);
    applicationsTable.appendChild(row);
  });
}

function editApplication(id) {
  const application = applications.find((item) => item.id === id);
  if (!application) return;

  document.getElementById("admin-application-id").value = application.id;
  document.getElementById("application-person").value = application.person_id;
  document.getElementById("application-job").value = application.advertisement_id;
  document.getElementById("application-message").value = application.application_message;

  document.getElementById("save-application").textContent = "Save Changes";
  document.getElementById("cancel-application").hidden = false;
  adminApplicationForm.scrollIntoView();
}

function resetApplicationForm() {
  adminApplicationForm.reset();
  document.getElementById("admin-application-id").value = "";
  document.getElementById("save-application").textContent = "Add Application";
  document.getElementById("cancel-application").hidden = true;
}

document.getElementById("cancel-application").addEventListener(
  "click",
  resetApplicationForm
);

adminApplicationForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = document.getElementById("admin-application-id").value;

  const application = {
    person_id: Number(document.getElementById("application-person").value),
    advertisement_id: Number(document.getElementById("application-job").value),
    application_message: document.getElementById("application-message").value.trim()
  };

  try {
    const response = await fetch(
      id ? `/admin/applications/${id}` : "/admin/applications",
      {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(application)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      applicationAdminMessage.textContent =
        data.error || "Failed to save application";
      return;
    }

    applicationAdminMessage.textContent = id
      ? "Application updated"
      : "Application added";

    resetApplicationForm();
    await loadApplications();
  } catch (error) {
    console.error(error);
    applicationAdminMessage.textContent = "Could not save application";
  }
});

async function deleteApplication(id) {
  if (!confirm("Are you sure you want to delete this application?")) return;

  try {
    const response = await fetch(`/admin/applications/${id}`, {
      method: "DELETE"
    });

    const data = await response.json();

    if (!response.ok) {
      applicationAdminMessage.textContent =
        data.error || "Failed to delete application";
      return;
    }

    applicationAdminMessage.textContent = "Application deleted";
    await loadApplications();
  } catch (error) {
    console.error(error);
    applicationAdminMessage.textContent = "Could not delete application";
  }
}


loadAdmin();
