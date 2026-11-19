
import { useState } from "react";
import {
  UserRound,
  LockKeyhole,
  LogOut,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import {
  updateUsername,
  updatePassword,
} from "../services/authService";

import "../App.css";

function Settings() {
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const clearFeedback = () => {
    setMessage("");
    setError("");
  };

  const handleUsernameUpdate = async (e) => {
    e.preventDefault();
    clearFeedback();

    if (!username.trim()) {
      setError("Please enter a username.");
      return;
    }

    try {
      setLoading(true);
      const result = await updateUsername(username.trim());
      setMessage(result.message);
      setUsername("");
    } catch (err) {
      setError(
        err.response?.data?.message || "Username update failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    clearFeedback();

    if (newPassword.length < 8) {
      setError("New password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const result = await updatePassword(
        currentPassword,
        newPassword
      );

      setMessage(result.message);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err.response?.data?.message || "Password update failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    const confirmed = window.confirm(
      "Are you sure you want to log out?"
    );

    if (!confirmed) return;

    localStorage.removeItem("token");
    window.location.href = "/";
  };

  return (
    <div className="dashboard settings-page">
      <div className="files-page-header">
        <div>
          <h1>Account Settings</h1>
          <p>Manage your CloudVault account and security.</p>
        </div>
      </div>

      {message && (
        <div className="settings-feedback success">
          <CheckCircle2 size={18} />
          {message}
        </div>
      )}

      {error && (
        <div className="settings-feedback error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <form
        className="settings-card"
        onSubmit={handleUsernameUpdate}
      >
        <h3><UserRound size={18} /> Change Username</h3>

        <input
          type="text"
          placeholder="Enter New Username"
          className="settings-input"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            clearFeedback();
          }}
          required
        />

        <button className="upload-btn" disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>

      <form
        className="settings-card"
        onSubmit={handlePasswordUpdate}
      >
        <h3><LockKeyhole size={18} /> Change Password</h3>

        <input
          type="password"
          placeholder="Enter Current Password"
          className="settings-input"
          value={currentPassword}
          onChange={(e) => {
            setCurrentPassword(e.target.value);
            clearFeedback();
          }}
          required
        />

        <input
          type="password"
          placeholder="Enter New Password (minimum 8 characters)"
          className="settings-input"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            clearFeedback();
          }}
          required
          minLength={8}
        />

        <input
          type="password"
          placeholder="Confirm New Password"
          className="settings-input"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            clearFeedback();
          }}
          required
        />

        <button className="upload-btn" disabled={loading}>
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>

      <div className="settings-card">
        <h3><LogOut size={18} /> Logout</h3>
        <p>Sign out from your CloudVault account.</p>

        <button className="upload-btn" onClick={logout}>
          Logout
        </button>
      </div>

      <div className="settings-card danger-card">
        <h3><ShieldAlert size={18} /> Danger Zone</h3>

        <p>
          Permanently delete your account and all associated
          stored files.
        </p>

        <button className="delete-btn" disabled>
          Delete Account — Coming Soon
        </button>
      </div>
    </div>
  );
}

export default Settings;
