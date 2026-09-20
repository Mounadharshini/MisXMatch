import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

// Automatically clear all legacy test, mock data, and fake notifications from localStorage for clean slate
try {
  if (!localStorage.getItem("misxmatch_clean_v9")) {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (
        k.startsWith("misxmatch_user_reports_") ||
        k.startsWith("misxmatch_user_sightings_") ||
        k.startsWith("misxmatch_all_missing_cases") ||
        k.startsWith("misxmatch_all_found_cases") ||
        k.startsWith("misxmatch_all_sightings") ||
        k.startsWith("misxmatch_mock_cases") ||
        k.startsWith("misxmatch_custom_cases") ||
        k.startsWith("misxmatch_hospital_patients") ||
        k.startsWith("misxmatch_ngo_residents") ||
        k.startsWith("misxmatch_notifs_") ||
        k === "misxmatch_notifs" ||
        k === "misxmatch_all_notifications" ||
        k === "misxmatch_my_reports" ||
        k === "misxmatch_track_cases" ||
        k === "misxmatch_all_evidence"
      )) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    localStorage.setItem("misxmatch_clean_v9", "true");
  }
  localStorage.removeItem("misxmatch_all_evidence");
} catch (e) {}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
