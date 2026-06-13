import React from "react";
import { createRoot } from "react-dom/client";
import { EnhancedOperations } from "./EnhancedOperations.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <EnhancedOperations />
  </React.StrictMode>,
);