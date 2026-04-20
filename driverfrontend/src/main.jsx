import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <App />
    <Toaster position="top-right" />
  </AuthProvider>
);
