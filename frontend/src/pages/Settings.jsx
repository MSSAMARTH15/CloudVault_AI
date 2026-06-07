import Sidebar from "../components/Sidebar";
import "../App.css";

function Settings() {
  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard">
        <div className="settings-container">
          <h1
            style={{
              marginBottom: "25px",
            }}
          >
            ⚙ Account Settings
          </h1>

          {/* USERNAME */}

          <div className="settings-card">
            <h3>
              📝 Change Username
            </h3>

            <input
              type="text"
              placeholder="Enter New Username"
              className="settings-input"
            />

            <button className="upload-btn">
              Save Changes
            </button>
          </div>

          {/* PASSWORD */}

          <div className="settings-card">
            <h3>
              🔒 Change Password
            </h3>

            <input
              type="password"
              placeholder="Enter New Password"
              className="settings-input"
            />

            <button className="upload-btn">
              Update Password
            </button>
          </div>

          {/* LOGOUT */}

          <div className="settings-card">
            <h3>
              🚪 Logout
            </h3>

            <p
              style={{
                marginBottom: "15px",
                opacity: "0.8",
              }}
            >
              Sign out from your account.
            </p>

            <button
              className="upload-btn"
              onClick={logout}
            >
              Logout
            </button>
          </div>

          {/* DELETE ACCOUNT */}

          <div className="settings-card danger-card">
            <h3>
              ⚠ Danger Zone
            </h3>

            <p
              style={{
                marginBottom: "15px",
                color: "#ff7b7b",
              }}
            >
              Permanently delete your account
              and all stored files.
            </p>

            <button className="delete-btn">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;