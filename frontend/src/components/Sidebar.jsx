
import { Link } from "react-router-dom";
import "../App.css";

function Sidebar() {
  console.log("SIDEBAR RENDERED");
  return (
    <aside className="sidebar">
    <h2>☁ CloudVault</h2>

      <ul>
        <li>
          <Link
            className="sidebar-link"
            to="/dashboard"
          >
            🏠 Dashboard
          </Link>
        </li>

        <li>
          <Link
            className="sidebar-link"
            to="/myfiles"
          >
            📁 My Files
          </Link>
        </li>

        <li>
          <Link
            className="sidebar-link"
            to="/uploads"
          >
            ☁ Uploads
          </Link>
        </li>

        <li>
          <Link
            className="sidebar-link"
            to="/settings"
          >
            ⚙ Settings
          </Link>
        </li>
      </ul>
    </aside>
  );
}

export default Sidebar;