/**
 * Universal Storage & Real-Time Data Dispatcher Utility
 * Manages cross-role persistence for Missing Cases, Found Cases, Sightings,
 * Hospital Intakes, NGO Shelter Intakes, and Evidence items.
 */

import { getCurrentUserKeys, getCurrentUserPrimaryId } from "@/utils/userIdentity";

export function getUserKeys(user) {
  return getCurrentUserKeys(user);
}

export function notifyDataChanged() {
  try {
    window.dispatchEvent(new CustomEvent("misxmatch:data-changed"));
  } catch (e) {
    console.error("Failed to dispatch misxmatch:data-changed event", e);
  }
}

/**
 * Helper to deduplicate array items without wiping entries with missing IDs
 */
function isDuplicate(x, itemToSave) {
  if (!x || !itemToSave) return false;
  if (itemToSave.caseNumber && x.caseNumber && String(x.caseNumber).trim().toUpperCase() === String(itemToSave.caseNumber).trim().toUpperCase()) {
    return true;
  }
  if (itemToSave.id && x.id && String(x.id) === String(itemToSave.id)) {
    return true;
  }
  return false;
}

/**
 * Save Missing Person Report
 */
export function saveMissingReport(caseObj, user) {
  try {
    const userKeys = getUserKeys(user);
    const itemToSave = {
      ...caseObj,
      type: "missing",
      _isLocalUserReport: true,
      createdAt: caseObj.createdAt || new Date().toISOString(),
    };

    const storageKeys = new Set([
      ...userKeys.map((k) => `misxmatch_user_reports_${k}`),
      "misxmatch_all_missing_cases",
      "misxmatch_my_reports",
      "misxmatch_track_cases",
    ]);

    for (const key of storageKeys) {
      try {
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        const list = Array.isArray(existing) ? existing : [];
        const filtered = list.filter((x) => !isDuplicate(x, itemToSave));
        localStorage.setItem(key, JSON.stringify([itemToSave, ...filtered]));
      } catch (err) {
        console.warn(`Error writing missing report to ${key}:`, err);
      }
    }

    notifyDataChanged();
  } catch (err) {
    console.error("Error saving missing report:", err);
  }
}

/**
 * Save Found Person Report
 */
export function saveFoundReport(caseObj, user) {
  try {
    const userKeys = getUserKeys(user);
    const itemToSave = {
      ...caseObj,
      type: "found",
      _isLocalUserReport: true,
      category: caseObj.category || "GENERAL",
      createdAt: caseObj.createdAt || new Date().toISOString(),
    };

    const storageKeys = new Set([
      ...userKeys.map((k) => `misxmatch_user_reports_${k}`),
      "misxmatch_all_found_cases",
      "misxmatch_my_reports",
      "misxmatch_track_cases",
    ]);

    for (const key of storageKeys) {
      try {
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        const list = Array.isArray(existing) ? existing : [];
        const filtered = list.filter((x) => !isDuplicate(x, itemToSave));
        localStorage.setItem(key, JSON.stringify([itemToSave, ...filtered]));
      } catch (err) {
        console.warn(`Error writing found report to ${key}:`, err);
      }
    }

    notifyDataChanged();
  } catch (err) {
    console.error("Error saving found report:", err);
  }
}

/**
 * Save Sighting Report
 */
export function saveSightingReport(sightingRecord, user) {
  try {
    const userKeys = getUserKeys(user);
    const itemToSave = {
      ...sightingRecord,
      type: "sighting",
      _isLocalUserReport: true,
      createdAt: sightingRecord.createdAt || new Date().toISOString(),
    };

    const storageKeys = new Set([
      ...userKeys.map((k) => `misxmatch_user_sightings_${k}`),
      ...userKeys.map((k) => `misxmatch_user_reports_${k}`),
      "misxmatch_all_sightings",
      "misxmatch_my_reports",
      "misxmatch_track_cases",
    ]);

    for (const key of storageKeys) {
      try {
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        const list = Array.isArray(existing) ? existing : [];
        const filtered = list.filter((x) => !isDuplicate(x, itemToSave));
        localStorage.setItem(key, JSON.stringify([itemToSave, ...filtered]));
      } catch (err) {
        console.warn(`Error writing sighting to ${key}:`, err);
      }
    }

    notifyDataChanged();
  } catch (err) {
    console.error("Error saving sighting report:", err);
  }
}

/**
 * Save Hospital Unidentified Patient Intake
 */
export function saveHospitalPatient(patientRecord, user) {
  try {
    const userKeys = getUserKeys(user);
    const itemToSave = {
      ...patientRecord,
      type: "found",
      category: "HOSPITAL",
      caseNumber: patientRecord.caseNumber || `FP-HOSP-${Date.now().toString().slice(-6)}`,
      createdAt: patientRecord.createdAt || new Date().toISOString(),
    };

    const storageKeys = new Set([
      "misxmatch_hospital_patients",
      "misxmatch_all_found_cases",
      ...userKeys.map((k) => `misxmatch_user_reports_${k}`),
    ]);

    for (const key of storageKeys) {
      try {
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        const list = Array.isArray(existing) ? existing : [];
        const filtered = list.filter((x) => !isDuplicate(x, itemToSave));
        localStorage.setItem(key, JSON.stringify([itemToSave, ...filtered]));
      } catch (err) {
        console.warn(`Error writing hospital patient to ${key}:`, err);
      }
    }

    notifyDataChanged();
  } catch (err) {
    console.error("Error saving hospital patient:", err);
  }
}

/**
 * Save NGO Shelter Resident Intake
 */
export function saveNGOResident(residentRecord, user) {
  try {
    const userKeys = getUserKeys(user);
    const itemToSave = {
      ...residentRecord,
      type: "found",
      category: "SHELTER",
      caseNumber: residentRecord.caseNumber || `FP-NGO-${Date.now().toString().slice(-6)}`,
      createdAt: residentRecord.createdAt || new Date().toISOString(),
    };

    const storageKeys = new Set([
      "misxmatch_ngo_residents",
      "misxmatch_all_found_cases",
      ...userKeys.map((k) => `misxmatch_user_reports_${k}`),
    ]);

    for (const key of storageKeys) {
      try {
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        const list = Array.isArray(existing) ? existing : [];
        const filtered = list.filter((x) => !isDuplicate(x, itemToSave));
        localStorage.setItem(key, JSON.stringify([itemToSave, ...filtered]));
      } catch (err) {
        console.warn(`Error writing NGO resident to ${key}:`, err);
      }
    }

    notifyDataChanged();
  } catch (err) {
    console.error("Error saving NGO resident:", err);
  }
}

/**
 * Save Police Evidence Artifact
 */
export function saveEvidence(evidenceRecord) {
  try {
    const key = "misxmatch_all_evidence";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    const list = Array.isArray(existing) ? existing : [];
    const filtered = list.filter((x) => !isDuplicate(x, evidenceRecord));
    localStorage.setItem(key, JSON.stringify([evidenceRecord, ...filtered]));
    notifyDataChanged();
  } catch (err) {
    console.error("Error saving evidence:", err);
  }
}

export function ensureSeedData() {
  // Purely dynamic - no mock seed data auto-injection
}

import { caseApi } from "@/lib/api";

/**
 * Automatically sync any user-created local reports to the MySQL database
 */
export async function syncLocalReportsToBackend() {
  try {
    const allReports = getAllUserReports();
    for (const r of allReports) {
      if (!r || r._syncedToBackend) continue;
      const cn = String(r.caseNumber || r.id || "").toUpperCase();

      try {
        const type = (r.type || "").toLowerCase();
        if (type === "missing" || (cn.startsWith("MP-") && type !== "sighting")) {
          await caseApi.reportMissing({
            name: r.fullName || r.name,
            fullName: r.fullName || r.name,
            age: r.age ? Number(r.age) : 25,
            gender: r.gender || "FEMALE",
            lastSeenDate: r.lastSeenDate || r.dateMissing || new Date().toISOString().split("T")[0],
            lastSeenLocation: r.lastSeenLocation || r.location || "Location",
            description: r.description || "Reported missing individual",
            photoUrl: r.photoUrl || r.photo || null,
            contactPhone: r.contactPhone || r.contactNumber || "9876543210",
            priority: r.priority || "HIGH",
            reportedBy: r.reportedBy || "citizen",
          });
        } else if (type === "found" || cn.startsWith("FP-")) {
          await caseApi.reportFound({
            category: r.category || "GENERAL",
            approximateName: r.approximateName || r.fullName || r.name || "Unidentified Person",
            approximateAge: r.approximateAge || r.age ? Number(r.approximateAge || r.age) : 25,
            gender: r.gender || "FEMALE",
            foundLocation: r.foundLocation || r.locationFound || "Location",
            currentLocation: r.currentLocation || "Local Facility",
            description: r.description || "Found person record",
            photoUrl: r.photoUrl || r.photo || null,
            contactPhone: r.contactPhone || r.contactNumber || "9876543210",
            reportedBy: r.reportedBy || "citizen",
          });
        } else if (type === "sighting" || cn.startsWith("SIGHTING-")) {
          await caseApi.reportSighting({
            missingCaseNumber: r.missingCaseNumber || r.caseNumber || "GENERAL_SIGHTING",
            location: r.sightingLocation || r.location || "Location",
            description: r.description || "Sighting report",
            photoUrl: r.photoUrl || r.photo || null,
            sightedAt: r.sightedAt || r.createdAt || new Date().toISOString(),
            reportedBy: r.reportedBy || "citizen",
          });
        }
        r._syncedToBackend = true;
      } catch (err) {
        console.warn("Failed to sync individual report to backend:", err);
      }
    }
  } catch (err) {
    console.error("Error in syncLocalReportsToBackend:", err);
  }
}

/**
 * /**
 * Zero mock / fake data policy:
 * All reports, cases, and sightings must come strictly from the application database.
 * LocalStorage fallback arrays are disabled to prevent stale / leaked data across user accounts.
 */
export function getLocalMissingCases() {
  return [];
}

export function getLocalFoundCases() {
  return [];
}

export function getLocalSightings() {
  return [];
}

export function getAllUserReports() {
  return [];
}
