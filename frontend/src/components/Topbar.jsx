
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  Search,
  UserRound,
  Settings,
  LogOut,
  X,
  AlertTriangle,
  CheckCircle2,
  File,
} from "lucide-react";

import { getProfile } from "../services/authService";
import { getMyFiles } from "../services/fileService";
import { getStorageMetrics } from "../services/monitoringService";
import { getRecoveryStatus } from "../services/recoveryService";

import "../App.css";

const pageTitles = {
  "/dashboard": "Dashboard",
  "/myfiles": "My Files",
  "/uploads": "Uploads",
  "/settings": "Settings",
  "/storage-nodes": "Storage Nodes",
  "/replication": "Replication",
  "/recovery": "Recovery Center",
};

function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [files, setFiles] = useState([]);
  const [profile, setProfile] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [recovery, setRecovery] = useState(null);

  const title = pageTitles[location.pathname] || "CloudVault";

  useEffect(() => {
    const loadProfileAndFiles = async () => {
      try {
        const [profileResult, filesResult] = await Promise.all([
          getProfile(),
          getMyFiles(),
        ]);

        setProfile(profileResult.user);
        setFiles(filesResult);
      } catch (error) {
        console.error("Topbar account/search loading error:", error);
      }
    };

    loadProfileAndFiles();
  }, []);

  useEffect(() => {
    let active = true;

    const loadSystemNotifications = async () => {
      const [metricsResult, recoveryResult] = await Promise.allSettled([
        getStorageMetrics(),
        getRecoveryStatus(),
      ]);

      if (!active) return;

      if (metricsResult.status === "fulfilled") {
        setMetrics(metricsResult.value);
      }

      if (recoveryResult.status === "fulfilled") {
        setRecovery(recoveryResult.value);
      }
    };

    loadSystemNotifications();

    const interval = setInterval(loadSystemNotifications, 30000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const filteredFiles = useMemo(() => {
    if (!searchTerm.trim()) return [];

    return files
      .filter((file) =>
        file.file_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 6);
  }, [files, searchTerm]);

  const offlineNodes = (metrics?.nodes || []).filter(
    (node) => !Number(node.is_available)
  );

  const recentEvents = (recovery?.recentEvents || []).filter((event) =>
    [
      "primary_missing",
      "primary_corrupted",
      "repair_failed",
      "cycle_failed",
    ].includes(event.event_type)
  ).slice(0, 4);

  const notificationCount = offlineNodes.length + recentEvents.length;

  const closePanels = () => {
    setSearchOpen(false);
    setNotificationOpen(false);
    setProfileOpen(false);
  };

  const handleFileSelect = (file) => {
    closePanels();
    navigate("/myfiles", {
      state: { searchTerm: file.file_name },
    });
  };

  const logout = () => {
    const confirmed = window.confirm(
      "Are you sure you want to log out?"
    );

    if (!confirmed) return;

    localStorage.removeItem("token");
    navigate("/", { replace: true });
  };

  return (
    <header className="topbar">
      <div>
        <p className="topbar-eyebrow">CLOUDVAULT / WORKSPACE</p>
        <h1>{title}</h1>
      </div>

      <div className="topbar-actions">
        {/* SEARCH */}
        <div className="topbar-control">
          <button
            className={`topbar-icon ${searchOpen ? "selected" : ""}`}
            aria-label="Search files"
            onClick={() => {
              setSearchOpen(!searchOpen);
              setNotificationOpen(false);
              setProfileOpen(false);
              setSearchTerm("");
            }}
          >
            <Search size={19} />
          </button>

          {searchOpen && (
            <div className="topbar-popover search-popover">
              <div className="popover-heading">
                <strong>Search files</strong>
                <button onClick={() => setSearchOpen(false)}>
                  <X size={16} />
                </button>
              </div>

              <input
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search your files..."
              />

              <div className="topbar-search-results">
                {!searchTerm.trim() ? (
                  <p className="popover-empty">
                    Start typing to search your files.
                  </p>
                ) : filteredFiles.length === 0 ? (
                  <p className="popover-empty">No matching files found.</p>
                ) : (
                  filteredFiles.map((file) => (
                    <button
                      className="topbar-result"
                      key={file.file_id}
                      onClick={() => handleFileSelect(file)}
                    >
                      <File size={17} />
                      <span>{file.file_name}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* NOTIFICATIONS */}
        <div className="topbar-control">
          <button
            className={`topbar-icon ${notificationOpen ? "selected" : ""}`}
            aria-label="Notifications"
            onClick={() => {
              setNotificationOpen(!notificationOpen);
              setSearchOpen(false);
              setProfileOpen(false);
            }}
          >
            <Bell size={19} />
            {notificationCount > 0 && (
              <span className="notification-dot" />
            )}
          </button>

          {notificationOpen && (
            <div className="topbar-popover notification-popover">
              <div className="popover-heading">
                <strong>System Notifications</strong>
                <button onClick={() => setNotificationOpen(false)}>
                  <X size={16} />
                </button>
              </div>

              {offlineNodes.length === 0 && recentEvents.length === 0 ? (
                <div className="popover-empty">
                  <CheckCircle2 size={22} />
                  <p>No current node outages or recent recovery alerts.</p>
                </div>
              ) : (
                <div className="notification-list">
                  {offlineNodes.map((node) => (
                    <div className="notification-item" key={node.node_id}>
                      <AlertTriangle size={17} className="notification-danger" />
                      <div>
                        <strong>Storage node unavailable</strong>
                        <p>{node.node_id} is currently offline.</p>
                      </div>
                    </div>
                  ))}

                  {recentEvents.map((event) => (
                    <div className="notification-item" key={event.log_id}>
                      <AlertTriangle size={17} className="notification-warning" />
                      <div>
                        <strong>
                          {event.event_type.replaceAll("_", " ")}
                        </strong>
                        <p>{event.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                className="popover-footer-action"
                onClick={() => {
                  closePanels();
                  navigate("/recovery");
                }}
              >
                Open Recovery Center
              </button>
            </div>
          )}
        </div>

        {/* PROFILE */}
        <div className="topbar-control">
          <button
            className="profile-avatar"
            aria-label="Account menu"
            onClick={() => {
              setProfileOpen(!profileOpen);
              setSearchOpen(false);
              setNotificationOpen(false);
            }}
          >
            {profile?.name?.slice(0, 2).toUpperCase() || "CV"}
          </button>

          {profileOpen && (
            <div className="topbar-popover profile-popover">
              <div className="profile-popover-user">
                <div className="profile-avatar profile-avatar-large">
                  {profile?.name?.slice(0, 2).toUpperCase() || "CV"}
                </div>
                <div>
                  <strong>{profile?.name || "CloudVault User"}</strong>
                  <p>{profile?.email || "Account details unavailable"}</p>
                </div>
              </div>

              <button
                className="profile-menu-item"
                onClick={() => {
                  closePanels();
                  navigate("/settings");
                }}
              >
                <Settings size={17} />
                Account Settings
              </button>

              <button className="profile-menu-item logout-item" onClick={logout}>
                <LogOut size={17} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;
