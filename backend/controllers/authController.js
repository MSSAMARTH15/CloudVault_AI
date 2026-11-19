const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { deleteChunk } = require("../services/storageClient");
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

const updateUsername = (req, res) => {
  const { name } = req.body;
  const userId = req.user.userId;

  if (!name || !name.trim()) {
    return res.status(400).json({
      message: "Username cannot be empty",
    });
  }

  db.query(
    "UPDATE users SET name = ? WHERE user_id = ?",
    [name.trim(), userId],
    (err, result) => {
      if (err) {
        return res.status(500).json({
          message: "Failed to update username",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      return res.json({
        success: true,
        message: "Username updated successfully",
        name: name.trim(),
      });
    }
  );
};

const updatePassword = (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId;

  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({
      message: "Provide your current password and a new password of at least 8 characters",
    });
  }

  db.query(
    "SELECT password FROM users WHERE user_id = ?",
    [userId],
    async (err, results) => {
      try {
        if (err) {
          return res.status(500).json({
            message: "Database Error",
          });
        }

        if (results.length === 0) {
          return res.status(404).json({
            message: "User not found",
          });
        }

        const isMatch = await bcrypt.compare(
          currentPassword,
          results[0].password
        );

        if (!isMatch) {
          return res.status(400).json({
            message: "Current password is incorrect",
          });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        db.query(
          "UPDATE users SET password = ? WHERE user_id = ?",
          [hashedPassword, userId],
          (updateError) => {
            if (updateError) {
              return res.status(500).json({
                message: "Failed to update password",
              });
            }

            return res.json({
              success: true,
              message: "Password updated successfully",
            });
          }
        );
      } catch (error) {
        return res.status(500).json({
          message: "Password update failed",
        });
      }
    }
  );
};


const deleteAccount = async (req, res) => {
  const userId = req.user.userId;

  const query = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

  try {
    // 1. Verify the account exists.
    const users = await query(
      "SELECT user_id FROM users WHERE user_id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "Account not found",
      });
    }

    // 2. Retrieve every primary and replica path.
    const paths = await query(
      `
      SELECT fc.chunk_path AS stored_path
      FROM file_chunks fc
      JOIN files f ON fc.file_id = f.file_id
      WHERE f.user_id = ?

      UNION ALL

      SELECT cr.replica_path AS stored_path
      FROM chunk_replicas cr
      JOIN file_chunks fc ON cr.chunk_id = fc.chunk_id
      JOIN files f ON fc.file_id = f.file_id
      WHERE f.user_id = ?
      `,
      [userId, userId]
    );

    // 3. Remove physical chunks before deleting metadata.
    for (const { stored_path: storedPath } of paths) {
      if (!storedPath) continue;

      const match =
        /^remote:(\d+):([a-zA-Z0-9_-]+)$/.exec(storedPath);

      if (!match) {
        // Do not silently skip legacy/unknown storage paths.
        throw new Error(
          "Unsupported storage path; manual cleanup required"
        );
      }

      const nodeId = Number(match[1]);
      const chunkId = match[2];

      await deleteChunk(nodeId, chunkId);
    }

    // 4. Remove sharing records that reference the user
    // or any file owned by the user.
    await query(
      `
      DELETE FROM file_shares
      WHERE owner_id = ?
         OR shared_user_id = ?
         OR file_id IN (
           SELECT file_id FROM files WHERE user_id = ?
         )
      `,
      [userId, userId, userId]
    );

    // 5. Remove replica metadata.
    await query(
      `
      DELETE cr
      FROM chunk_replicas cr
      JOIN file_chunks fc ON cr.chunk_id = fc.chunk_id
      JOIN files f ON fc.file_id = f.file_id
      WHERE f.user_id = ?
      `,
      [userId]
    );

    // 6. Delete the user.
    // Existing CASCADE relationships remove their
    // files and primary chunk metadata.
    const result = await query(
      "DELETE FROM users WHERE user_id = ?",
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Account not found",
      });
    }

    return res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Account deletion failed:", error);

    return res.status(500).json({
      message:
        "Account deletion could not be completed. Please contact support or retry after checking storage availability.",
    });
  }
};


module.exports = {
  registerUser,
  loginUser,
  updateUsername,
  updatePassword,
  deleteAccount,
};