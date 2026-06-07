const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

// REGISTER
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const checkUserQuery =
      "SELECT * FROM users WHERE email = ?";

    db.query(checkUserQuery, [email], async (err, results) => {
      if (err) {
        return res.status(500).json({
          message: "Database Error",
          error: err.message,
        });
      }

      if (results.length > 0) {
        return res.status(400).json({
          message: "User already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const insertQuery =
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";

      db.query(
        insertQuery,
        [name, email, hashedPassword],
        (err, result) => {
          if (err) {
            return res.status(500).json({
              message: "Registration Failed",
              error: err.message,
            });
          }

          res.status(201).json({
            message: "User Registered Successfully",
          });
        }
      );
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

// LOGIN
const loginUser = (req, res) => {
  const { email, password } = req.body;

  const query =
    "SELECT * FROM users WHERE email = ?";

  db.query(query, [email], async (err, results) => {
    try {
      if (err) {
        return res.status(500).json({
          message: "Database Error",
          error: err.message,
        });
      }

      if (results.length === 0) {
        return res.status(400).json({
          message: "User not found",
        });
      }

      const user = results[0];

      console.log("USER FOUND:", user.email);

      const isMatch = await bcrypt.compare(
        password,
        user.password
      );

      console.log("PASSWORD MATCH:", isMatch);

      if (!isMatch) {
        return res.status(400).json({
          message: "Invalid Password",
        });
      }

      console.log("JWT SECRET:", process.env.JWT_SECRET);

      const token = jwt.sign(
        {
          userId: user.user_id,
          email: user.email,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "1d",
        }
      );

      res.status(200).json({
        message: "Login Successful",
        token,
      });
    } catch (error) {
      console.log("LOGIN ERROR:", error);

      res.status(500).json({
        message: "Server Error",
        error: error.message,
      });
    }
  });
};

module.exports = {
  registerUser,
  loginUser,
};