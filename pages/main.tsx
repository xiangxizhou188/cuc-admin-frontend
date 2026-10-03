import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AdminApp } from "../app/admin-app";
import "../app/globals.css";

if (typeof document !== "undefined") {
  const root = document.getElementById("root");

  if (!root) {
    throw new Error("Missing admin application root");
  }

  createRoot(root).render(
    <StrictMode>
      <AdminApp />
    </StrictMode>,
  );
}
