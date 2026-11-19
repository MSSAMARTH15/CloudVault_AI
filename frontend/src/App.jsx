
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import StorageNodes from "./pages/StorageNodes";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import MyFiles from "./pages/MyFiles";
import Uploads from "./pages/Uploads";
import Settings from "./pages/Settings";
import Replication from "./pages/Replication";
import Recovery from "./pages/Recovery";
import Layout from "./components/Layout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
      
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/myfiles" element={<MyFiles />} />
          <Route path="/replication" element={<Replication />} />
          <Route path="/uploads" element={<Uploads />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/storage-nodes" element={<StorageNodes />} />
          <Route path="/recovery" element={<Recovery />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
