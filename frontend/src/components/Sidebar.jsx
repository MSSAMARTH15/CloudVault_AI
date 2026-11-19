
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Files,
  CloudUpload,
  Server,
  GitBranch,
  RotateCcw,
  Settings,
  Cloud,
} from "lucide-react";
import "../App.css";

function Sidebar() {
  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "My Files", path: "/myfiles", icon: Files },
    { label: "Uploads", path: "/uploads", icon: CloudUpload },
    { label: "Storage Nodes", path: "/storage-nodes", icon: Server },
    { label: "Replication", path: "/replication", icon: GitBranch },
    { label: "Recovery Center", path: "/recovery", icon: RotateCcw },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">
          <Cloud size={23} />
        </div>
        <div>
          <h2>CloudVault</h2>
          <span>Distributed Storage</span>
        </div>
      </div>

      <div className="sidebar-section-label">WORKSPACE</div>

      <ul className="sidebar-nav">
        {navItems.map(({ label, path, icon: Icon }) => (
          <li key={path}>
            <NavLink
              to={path}
              className={({ isActive }) =>
                `sidebar-link${isActive ? " active" : ""}`
              }
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="sidebar-bottom">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `sidebar-link${isActive ? " active" : ""}`
          }
        >
          <Settings size={19} strokeWidth={1.8} />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}

export default Sidebar;
