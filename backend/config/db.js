const mysql = require("mysql2");
const path = require("path");
const dotenv = require("dotenv");

// Load .env using an absolute path
dotenv.config({
  path: path.join(__dirname, "../.env"),
});

console.log("DB CONFIG CHECK:", {
  DB_HOST: process.env.DB_HOST || "MISSING",
  DB_USER: process.env.DB_USER ? "PRESENT" : "MISSING",
  DB_PASSWORD: process.env.DB_PASSWORD ? "PRESENT" : "MISSING",
  DB_NAME: process.env.DB_NAME || "MISSING",
});

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

connection.connect((err) => {
  if (err) {
    console.log("❌ MySQL Connection Failed:", err.message);
  } else {
    console.log("✅ MySQL Connected");
  }
});

module.exports = connection;