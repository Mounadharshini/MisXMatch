// Platform constants, role definitions, and UI badge utilities

export const ROLES = {
  PUBLIC: "public",
  HOSPITAL: "hospital",
  NGO: "ngo",
  POLICE: "police",
  ADMIN: "admin",
};

export const ROLE_LABEL = {
  public: "Public User",
  hospital: "Hospital Authority",
  ngo: "NGO / Shelter Coordinator",
  shelter: "Shelter Care Manager",
  police: "Police Officer",
  admin: "Platform Administrator",
  PUBLIC_USER: "Public User",
  HOSPITAL: "Hospital Authority",
  NGO: "NGO / Shelter Coordinator",
  SHELTER: "Shelter Care Manager",
  POLICE: "Police Officer",
  ADMIN: "Platform Administrator",
  SUPER_ADMIN: "Super Administrator",
};

export const PLATFORM_PARTNERS = [
  { name: "Ministry of Home Affairs", type: "Government Authority", icon: "Building" },
  { name: "National Crime Records Bureau (NCRB)", type: "Law Enforcement", icon: "Shield" },
  { name: "AIIMS Trauma & Emergency Network", type: "Healthcare Partner", icon: "Activity" },
  { name: "Bachpan Bachao Andolan", type: "Child Protection NGO", icon: "Heart" },
  { name: "National Commission for Women", type: "Statutory Body", icon: "Award" },
  { name: "Indian Red Cross Society", type: "Humanitarian Network", icon: "Cross" },
];

export const PLATFORM_TESTIMONIALS = [
  {
    name: "Inspector Rajesh Sharma",
    role: "Crime Branch, Delhi Police",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    quote:
      "MISXMATCH's AI facial recognition and geospatial cross-matching reduced our case identification turnaround from 72 hours to under 30 minutes. It is a transformational platform for investigative tracking.",
  },
  {
    name: "Dr. Priya Nair",
    role: "Trauma Emergency, AIIMS New Delhi",
    avatar: "https://images.unsplash.com/photo-1594824813589-21820b22a00c?w=120&auto=format&fit=crop&q=80",
    quote:
      "When unidentified trauma patients arrive in critical care, instant photo intake and automatic matching against missing citizen databases allows us to locate families immediately.",
  },
  {
    name: "Sunita Rao",
    role: "National Coordinator, Bachpan Bachao Andolan",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80",
    quote:
      "Cross-referencing shelter intake photos with real-time missing person FIRs across state boundaries has empowered our field teams to safely reunite over 180 children.",
  },
];

export const SUCCESS_STORIES = [
  {
    id: "s1",
    title: "9-Year-Old Boy Reunited in 14 Hours",
    location: "Kashmere Gate, Delhi NCR",
    date: "Verified Resolution",
    photo: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=500&auto=format&fit=crop&q=80",
    summary:
      "A CCTV camera frame analyzed at Kashmere Gate transit node matched a high-priority missing report. AIIMS trauma intake confirmed facial geometry and the child was safely returned home within 14 hours.",
    confidence: "98.4%",
    timeline: "14 hours turnaround",
  },
  {
    id: "s2",
    title: "Elderly Citizen Identified in Shelter Care",
    location: "Dadar, Mumbai, Maharashtra",
    date: "Verified Resolution",
    photo: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=500&auto=format&fit=crop&q=80",
    summary:
      "Sneha Sadan care shelter uploaded an intake photo of a disoriented senior citizen. The AI similarity model matched an active missing report filed 4 days earlier with 96.8% facial biometric confidence.",
    confidence: "96.8%",
    timeline: "Reunited after 4 days",
  },
  {
    id: "s3",
    title: "Student Located via Citizen Sighting",
    location: "Guindy Railway Station, Chennai",
    date: "Verified Resolution",
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
    summary:
      "A commuter uploaded a geotagged photo sighting near the suburban terminal. Local railway police verified the lead in real time, dispatched a patrol team, and reunited the college student with her family.",
    confidence: "94.2%",
    timeline: "Located in 6 hours",
  },
];

export const FAQ_ITEMS = [
  {
    q: "How does the AI facial recognition and cross-matching engine work?",
    a: "MISXMATCH uses multi-dimensional deep facial embeddings, physical descriptor matching (height, build, scars, clothing), and demographic proximity filters to compare missing person reports against hospital intake records, shelter residents, and CCTV frames in real time.",
  },
  {
    q: "Is citizen Aadhaar and personal information securely protected?",
    a: "Yes. Aadhaar numbers are SHA-256 hashed and masked across the platform (XXXX-XXXX-1234). Sensitive identity records are strictly gated behind role-based access controls and recorded on an immutable, tamper-proof audit log.",
  },
  {
    q: "Can citizens submit sightings anonymously?",
    a: "Yes! Any citizen can submit a sighting anonymously without registering. Verified accounts are required only when filing formal missing or found person cases to maintain evidentiary integrity.",
  },
  {
    q: "How do Police, Hospital, and NGO accounts get verified?",
    a: "Institutional accounts must submit official credentials, registration IDs, and nodal officer details during signup. Platform administrators review and approve credentials before institutional access is activated.",
  },
  {
    q: "What happens when a high-confidence match is detected?",
    a: "When a match exceeds 85% confidence, instant automated priority alerts are dispatched to the assigned police investigation unit, reporting family members, and the sheltering institution simultaneously.",
  },
  {
    q: "Are system audit logs permanent and immutable?",
    a: "Yes. Every single action—from case creation and status changes to data access and sighting verification—is recorded as an append-only audit trail that cannot be modified or deleted by any user or administrator.",
  },
];

export function priorityBadgeClass(priority) {
  const p = (priority || "").toLowerCase();
  switch (p) {
    case "critical":
      return "badge-critical";
    case "high":
      return "badge-high";
    case "medium":
      return "badge-medium";
    case "low":
      return "badge-low";
    default:
      return "badge-low";
  }
}

export function priorityColor(priority) {
  const p = (priority || "").toLowerCase();
  switch (p) {
    case "critical":
      return "#ef4444";
    case "high":
      return "#f97316";
    case "medium":
      return "#eab308";
    case "low":
      return "#10b981";
    default:
      return "#6b7280";
  }
}

export function confidenceBand(score) {
  let v = Number(score) || 0;
  if (v > 0 && v <= 1.0) v = v * 100;
  if (v >= 85) {
    return {
      label: "High Similarity – Review Required",
      color: "#ea580c",
      badgeClass: "badge-high",
      action: "Urgent Police Verification",
    };
  }
  if (v >= 65) {
    return {
      label: "Needs Review",
      color: "#f59e0b",
      badgeClass: "badge-medium",
      action: "Manual Investigator Review",
    };
  }
  if (v >= 50) {
    return {
      label: "Potential Match",
      color: "#3b82f6",
      badgeClass: "badge-low",
      action: "Additional Evidence Needed",
    };
  }
  return {
    label: "Low Confidence",
    color: "#6b7280",
    badgeClass: "badge-low",
    action: "Archived for Reference",
  };
}

export const CASE_STATUS_CONFIG = {
  OPEN: { label: "Submitted", tone: "critical", badge: "badge-critical" },
  SUBMITTED: { label: "Submitted", tone: "critical", badge: "badge-critical" },
  ACTIVE: { label: "Active Investigation", tone: "critical", badge: "badge-critical" },
  UNDER_INVESTIGATION: { label: "Investigation in Progress", tone: "warn", badge: "badge-high" },
  MATCH_FOUND: { label: "AI Match Identified", tone: "info", badge: "badge-info" },
  VERIFICATION_PENDING: { label: "Verification Pending", tone: "warn", badge: "badge-high" },
  EVIDENCE_SUBMITTED: { label: "Evidence Submitted", tone: "info", badge: "badge-info" },
  REUNIFICATION_PENDING: { label: "Awaiting Family Confirmation", tone: "warn", badge: "badge-high" },
  REUNIFICATION_CONFIRMED: { label: "Reunification Confirmed", tone: "ok", badge: "badge-ok" },
  MATCH_REJECTED: { label: "Match Rejected", tone: "critical", badge: "badge-critical" },
  CLOSURE_REQUESTED: { label: "Closure Pending Approval", tone: "warn", badge: "badge-medium" },
  PENDING_APPROVAL: { label: "Under Review", tone: "warn", badge: "badge-medium" },
  REUNITED: { label: "Reunited", tone: "ok", badge: "badge-ok" },
  CLOSED: { label: "Closed – Reunited", tone: "muted", badge: "badge-low" },
};
