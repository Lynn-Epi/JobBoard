const express = require("express");
const pool = require("./db");
const bcrypt = require("bcrypt");
const session = require("express-session");

const path = require("path");
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax" },
  }),
);

async function requireAdmin(req, res, next) {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Please log in" });
    }
    const result = await pool.query("SELECT role FROM people WHERE id = $1", [
      req.session.userId,
    ]);
    if (result.rows.length === 0 || result.rows[0].role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to check permissions" });
  }
}
app.use(express.static(path.join(__dirname, "../frontend")));
app.get("/", (req, res) => {
  res.send("Job Board API is running!");
});

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      message: "Database connected successfully!",
      database_time: result.rows[0].now,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database connection failed" });
  }
});

app.get("/ads", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT advertisements.*, companies.name AS company_name, categories.name AS category_name
      FROM advertisements
      JOIN companies ON companies.id = advertisements.company_id
      JOIN categories ON categories.id = advertisements.category_id
      WHERE advertisements.is_active = TRUE
      ORDER BY advertisements.id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to retrieve advertisements" });
  }
});

app.get("/ads/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await pool.query(
      `
      SELECT advertisements.*, companies.name AS company_name, companies.description AS company_description,
             categories.name AS category_name
      FROM advertisements
      JOIN companies ON companies.id = advertisements.company_id
      JOIN categories ON categories.id = advertisements.category_id
      WHERE advertisements.id = $1 AND advertisements.is_active = TRUE
    `,
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Advertisement not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to retrieve advertisement" });
  }
});

app.get("/companies/:id/ads", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await pool.query(
      "SELECT * FROM advertisements WHERE company_id = $1 AND is_active = TRUE",
      [id],
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Failed to retrieve company advertisements" });
  }
});

app.get("/companies", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM companies ORDER BY name");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to retrieve companies" });
  }
});

app.get("/categories", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories ORDER BY name");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to retrieve categories" });
  }
});

app.post("/ads", requireAdmin, async (req, res) => {
  try {
    const company_id = req.body.company_id;
    const category_id = req.body.category_id;
    const job_title = req.body.job_title;
    const description = req.body.description;
    const location = req.body.location;
    const salary = req.body.salary;
    const weekly_hours = req.body.weekly_hours;
    const responsible_person_id = req.body.responsible_person_id;
    if (!company_id || !category_id || !job_title || !description) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const result = await pool.query(
      `
      INSERT INTO advertisements
      (company_id, category_id, job_title, description, location, salary, weekly_hours, responsible_person_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `,
      [
        company_id,
        category_id,
        job_title,
        description,
        location || null,
        salary ?? null,
        weekly_hours ?? null,
        responsible_person_id || null,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    if (error.code === "23503")
      return res.status(400).json({ error: "Invalid related record" });
    res.status(500).json({ error: "Failed to create advertisement" });
  }
});

app.post("/ads/:id/applications", async (req, res) => {
  try {
    const advertisement_id = req.params.id;
    const application_message = req.body.application_message;
    if (!application_message || !application_message.trim()) {
      return res.status(400).json({ error: "Application message is required" });
    }
    const advertisement = await pool.query(
      "SELECT id FROM advertisements WHERE id = $1 AND is_active = TRUE",
      [advertisement_id],
    );
    if (advertisement.rows.length === 0) {
      return res.status(404).json({ error: "Advertisement not found" });
    }

    let person_id = req.session.userId;
    if (!person_id) {
      const first_name = req.body.first_name;
      const last_name = req.body.last_name;
      const email = req.body.email;
      const phone_number = req.body.phone_number;
      if (!first_name || !last_name || !email) {
        return res.status(400).json({ error: "Name and email are required" });
      }
      const existingPerson = await pool.query(
        "SELECT id, password_hash FROM people WHERE email = $1",
        [email],
      );

      if (existingPerson.rows.length > 0) {
        if (existingPerson.rows[0].password_hash) {
          return res.status(409).json({
            error:
              "This email belongs to a registered account. Please sign in.",
          });
        }

        person_id = existingPerson.rows[0].id;
      } else {
        const person = await pool.query(
          `
      INSERT INTO people (first_name, last_name, email, phone_number)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `,
          [first_name, last_name, email, phone_number || null],
        );

        person_id = person.rows[0].id;
      }
    }

    const result = await pool.query(
      `
      INSERT INTO applications (person_id, advertisement_id, application_message)
      VALUES ($1, $2, $3) RETURNING *
    `,
      [person_id, advertisement_id, application_message],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to submit application" });
  }
});

app.put("/ads/:id", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const allowedFields = [
      "company_id",
      "category_id",
      "responsible_person_id",
      "job_title",
      "description",
      "location",
      "salary",
      "weekly_hours",
      "is_active",
    ];
    const fields = allowedFields.filter(
      (field) => req.body[field] !== undefined,
    );
    if (fields.length === 0)
      return res.status(400).json({ error: "No fields to update" });
    const values = fields.map((field) => req.body[field]);
    const assignments = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(", ");
    const result = await pool.query(
      `UPDATE advertisements SET ${assignments} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Advertisement not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    if (error.code === "23503")
      return res.status(400).json({ error: "Invalid related record" });
    res.status(500).json({ error: "Failed to update advertisement" });
  }
});

app.delete("/ads/:id", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const result = await pool.query(
      "DELETE FROM advertisements WHERE id = $1 RETURNING *",
      [id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Advertisement not found" });
    res.json({ message: "Advertisement deleted" });
  } catch (error) {
    console.error(error);
    if (error.code === "23503")
      return res
        .status(409)
        .json({ error: "Cannot delete an advertisement with applications" });
    res.status(500).json({ error: "Failed to delete advertisement" });
  }
});

app.post("/register", async (req, res) => {
  try {
    const first_name = req.body.first_name;
    const last_name = req.body.last_name;
    const email = req.body.email;
    const password = req.body.password;
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const existingUser = await pool.query(
      "SELECT id, password_hash FROM people WHERE email = $1",
      [email],
    );
    if (existingUser.rows.length > 0 && existingUser.rows[0].password_hash) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const password_hash = await bcrypt.hash(password, 10);
    let result;
    if (existingUser.rows.length > 0) {
      result = await pool.query(
        `
        UPDATE people SET first_name = $1, last_name = $2, password_hash = $3
        WHERE id = $4 RETURNING id, first_name, last_name, email, role
      `,
        [first_name, last_name, password_hash, existingUser.rows[0].id],
      );
    } else {
      result = await pool.query(
        `
        INSERT INTO people (first_name, last_name, email, password_hash)
        VALUES ($1, $2, $3, $4) RETURNING id, first_name, last_name, email, role
      `,
        [first_name, last_name, email, password_hash],
      );
    }
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    if (error.code === "23505")
      return res.status(409).json({ error: "Email already registered" });
    res.status(500).json({ error: "Failed to register user" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const result = await pool.query("SELECT * FROM people WHERE email = $1", [
      email,
    ]);
    if (result.rows.length === 0 || !result.rows[0].password_hash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const user = result.rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches)
      return res.status(401).json({ error: "Invalid email or password" });
    req.session.regenerate((error) => {
      if (error) return res.status(500).json({ error: "Failed to log in" });
      req.session.userId = user.id;
      req.session.save((error) => {
        if (error) return res.status(500).json({ error: "Failed to log in" });
        res.status(200).json({
          message: "Login successful",
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            role: user.role,
          },
        });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to log in" });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) return res.status(500).json({ error: "Failed to log out" });
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out" });
  });
});

app.get("/me", async (req, res) => {
  try {
    if (!req.session.userId)
      return res.status(401).json({ error: "Please log in" });
    const result = await pool.query(
      `
      SELECT id, first_name, last_name, email, phone_number, cv_url, role
      FROM people WHERE id = $1
    `,
      [req.session.userId],
    );
    if (result.rows.length === 0)
      return res.status(401).json({ error: "User not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to retrieve account" });
  }
});

app.put("/me", async (req, res) => {
  try {
    if (!req.session.userId)
      return res.status(401).json({ error: "Please log in" });
    const allowedFields = [
      "first_name",
      "last_name",
      "email",
      "phone_number",
      "cv_url",
    ];
    const fields = allowedFields.filter(
      (field) => req.body[field] !== undefined,
    );
    if (fields.length === 0)
      return res.status(400).json({ error: "No fields to update" });
    const values = fields.map((field) => req.body[field]);
    const assignments = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(", ");
    const result = await pool.query(
      `
      UPDATE people SET ${assignments} WHERE id = $${values.length + 1}
      RETURNING id, first_name, last_name, email, phone_number, cv_url, role
    `,
      [...values, req.session.userId],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "User not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    if (error.code === "23505")
      return res.status(409).json({ error: "Email already registered" });
    res.status(500).json({ error: "Failed to update account" });
  }
});

const adminTables = {
  companies: [
    "name",
    "description",
    "email",
    "industry",
    "location",
    "website_url",
  ],
  categories: ["name"],
  people: ["first_name", "last_name", "email", "phone_number", "cv_url"],
  applications: ["person_id", "advertisement_id", "application_message"],
};

app.get("/admin/:table", requireAdmin, async (req, res) => {
  try {
    const table = req.params.table;
    if (!adminTables[table] && table !== "advertisements") {
      return res.status(404).json({ error: "Unknown table" });
    }
    const columns =
      table === "people"
        ? "id, first_name, last_name, email, phone_number, cv_url, role"
        : "*";
    const result = await pool.query(
      `SELECT ${columns} FROM ${table} ORDER BY id`,
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to retrieve records" });
  }
});

app.post("/admin/:table", requireAdmin, async (req, res) => {
  try {
    const table = req.params.table;
    if (!adminTables[table])
      return res.status(404).json({ error: "Unknown table" });
    const fields = adminTables[table].filter(
      (field) => req.body[field] !== undefined,
    );
    if (fields.length === 0)
      return res.status(400).json({ error: "No fields provided" });
    const values = fields.map((field) => req.body[field]);
    const placeholders = fields
      .map((field, index) => `$${index + 1}`)
      .join(", ");
    const returning =
      table === "people"
        ? "id, first_name, last_name, email, phone_number, cv_url, role"
        : "*";
    const result = await pool.query(
      `
      INSERT INTO ${table} (${fields.join(", ")}) VALUES (${placeholders}) RETURNING ${returning}
    `,
      values,
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    if (["23502", "23503", "23505"].includes(error.code)) {
      return res.status(400).json({ error: "Invalid or duplicate record" });
    }
    res.status(500).json({ error: "Failed to create record" });
  }
});

app.put("/admin/:table/:id", requireAdmin, async (req, res) => {
  try {
    const table = req.params.table;
    const id = req.params.id;
    if (!adminTables[table])
      return res.status(404).json({ error: "Unknown table" });
    const fields = adminTables[table].filter(
      (field) => req.body[field] !== undefined,
    );
    if (fields.length === 0)
      return res.status(400).json({ error: "No fields to update" });
    const values = fields.map((field) => req.body[field]);
    const assignments = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(", ");
    const returning =
      table === "people"
        ? "id, first_name, last_name, email, phone_number, cv_url, role"
        : "*";
    const result = await pool.query(
      `
      UPDATE ${table} SET ${assignments} WHERE id = $${values.length + 1} RETURNING ${returning}
    `,
      [...values, id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Record not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    if (["23502", "23503", "23505"].includes(error.code)) {
      return res.status(400).json({ error: "Invalid or duplicate record" });
    }
    res.status(500).json({ error: "Failed to update record" });
  }
});

app.delete("/admin/:table/:id", requireAdmin, async (req, res) => {
  try {
    const table = req.params.table;
    const id = req.params.id;
    if (!adminTables[table])
      return res.status(404).json({ error: "Unknown table" });
    if (table === "people" && Number(id) === req.session.userId) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }
    const result = await pool.query(
      `DELETE FROM ${table} WHERE id = $1 RETURNING id`,
      [id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Record not found" });
    res.json({ message: "Record deleted" });
  } catch (error) {
    console.error(error);
    if (error.code === "23503") {
      return res
        .status(409)
        .json({ error: "Record is referenced by another record" });
    }
    res.status(500).json({ error: "Failed to delete record" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
