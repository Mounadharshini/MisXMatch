// Central mock data + helpers. In-memory only.
export const ROLES = {
  PUBLIC: "public",
  HOSPITAL: "hospital",
  NGO: "ngo",
  POLICE: "police",
  ADMIN: "admin",
};

export const ROLE_LABEL = {
  public: "Public User",
  hospital: "Hospital",
  ngo: "NGO / Shelter",
  police: "Police Officer",
  admin: "Administrator",
};

const now = Date.now();
const daysAgo = (d) => new Date(now - d * 86400000).toISOString();

export const MOCK_STATS = {
  totalMissing: 12847,
  found: 9312,
  active: 3535,
  avgMatchMinutes: 47,
  hospitals: 412,
  ngos: 218,
  policeStations: 1120,
  aiAccuracy: 94.2,
};

export const MOCK_PARTNERS = [
  { name: "Ministry of Home Affairs", type: "Government" },
  { name: "National Crime Records Bureau", type: "Police" },
  { name: "AIIMS Network", type: "Hospital" },
  { name: "Bachpan Bachao Andolan", type: "NGO" },
  { name: "Missing Child Bureau", type: "Government" },
  { name: "Indian Red Cross", type: "NGO" },
];

export const MOCK_TESTIMONIALS = [
  {
    name: "Inspector R. Meena",
    role: "Delhi Police",
    quote:
      "MisXMatch cut our identification time from days to under an hour. The face-match dashboard is a genuine investigative tool.",
  },
  {
    name: "Dr. K. Bhattacharya",
    role: "AIIMS Trauma Centre",
    quote:
      "We can now flag unknown patients the moment they're admitted. Families reach us instead of us searching for them.",
  },
  {
    name: "Anita S.",
    role: "Reunited Family",
    quote:
      "My father was found in a shelter 300 km away, in 3 days. This platform saved my family.",
  },
];

export const MOCK_SUCCESS_STORIES = [
  {
    id: "s1",
    title: "8-year-old reunited within 14 hours",
    location: "Mumbai, Maharashtra",
    date: daysAgo(6),
    summary:
      "A CCTV frame from a railway station matched a report filed 9 hours earlier. Local police confirmed the match and the child was handed back to family the same night.",
  },
  {
    id: "s2",
    title: "Elderly patient identified at Trauma Centre",
    location: "Chennai, Tamil Nadu",
    date: daysAgo(19),
    summary:
      "Hospital uploaded an unidentified patient photo. AI matched a report filed by the family 2 weeks earlier with 96.8% confidence.",
  },
  {
    id: "s3",
    title: "Trafficking survivor found in shelter",
    location: "Kolkata, West Bengal",
    date: daysAgo(41),
    summary:
      "An NGO-run shelter's intake photo produced a 94% match. Verified by police and the survivor was safely reunited.",
  },
];

export const MOCK_FAQ = [
  { q: "Is my Aadhaar information safe?", a: "Aadhaar numbers are masked everywhere in the app (XXXX-XXXX-1234). Only verified authorities can view identity metadata under a signed access log." },
  { q: "How fast is the AI match?", a: "New reports are compared to the existing dataset in seconds; average investigation-grade match confirmation is 47 minutes." },
  { q: "Can I report anonymously?", a: "Sightings can be submitted anonymously. Missing/found person reports require Aadhaar-verified accounts to reduce false or malicious filings." },
  { q: "Who can close a case?", a: "Only administrators — after reviewing police evidence — can close a case. Police can request closure but cannot close a case themselves." },
  { q: "Are activity logs deletable?", a: "No. Audit logs are append-only. Not even administrators can delete them." },
];

// People
const firstNames = ["Aarav","Vivaan","Aditya","Vihaan","Arjun","Sai","Krishna","Ishaan","Rohan","Rehan","Ananya","Aadhya","Diya","Saanvi","Isha","Kavya","Meera","Aaradhya","Anaya","Riya","Mohammed","Suresh","Ramesh","Kiran","Priya","Anita","Lakshmi","Bhavna"];
const lastNames = ["Sharma","Verma","Iyer","Reddy","Khan","Patel","Singh","Nair","Das","Chatterjee","Bose","Bhat","Kulkarni","Menon","Joshi","Rao","Kapoor"];
const cities = [
  { name: "Mumbai", lat: 19.076, lng: 72.8777 },
  { name: "Delhi", lat: 28.6139, lng: 77.209 },
  { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
  { name: "Chennai", lat: 13.0827, lng: 80.2707 },
  { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
  { name: "Hyderabad", lat: 17.385, lng: 78.4867 },
  { name: "Pune", lat: 18.5204, lng: 73.8567 },
  { name: "Jaipur", lat: 26.9124, lng: 75.7873 },
  { name: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
  { name: "Lucknow", lat: 26.8467, lng: 80.9462 },
];
const genders = ["Male", "Female"];
const statuses = ["Active", "Under Investigation", "Sighting Reported", "Match Pending Review"];
const priorities = ["critical", "high", "medium", "low"];

function seedName(seed) {
  const f = firstNames[seed % firstNames.length];
  const l = lastNames[(seed * 7) % lastNames.length];
  return `${f} ${l}`;
}

function seedAvatar(seed, gender) {
  const g = gender === "Female" ? "women" : "men";
  return `https://randomuser.me/api/portraits/${g}/${seed % 90}.jpg`;
}

function seedPriority(age) {
  if (age <= 12 || age >= 65) return "critical";
  if (age <= 18) return "high";
  if (age <= 45) return "medium";
  return "low";
}

export const MOCK_MISSING = Array.from({ length: 24 }, (_, i) => {
  const gender = genders[i % 2];
  const age = 4 + ((i * 13) % 78);
  const city = cities[i % cities.length];
  const priority = seedPriority(age);
  const daysMissing = (i * 3 + 1) % 60;
  return {
    id: `MP-${2025000 + i}`,
    name: seedName(i + 3),
    age,
    gender,
    photo: seedAvatar(i + 3, gender),
    lastSeenCity: city.name,
    lastSeenLat: city.lat + (i % 5) * 0.01,
    lastSeenLng: city.lng - (i % 4) * 0.01,
    lastSeenAt: daysAgo(daysMissing),
    reportedBy: "Family",
    status: statuses[i % statuses.length],
    priority,
    aiConfidence: 40 + ((i * 11) % 60),
    description:
      "Wearing dark trousers and a light shirt. Speaks Hindi and English. Has a small scar on left cheek.",
    medical: i % 4 === 0 ? "Diabetic, requires medication" : "None reported",
    disabilities: i % 6 === 0 ? "Partial hearing loss" : "None",
    languages: i % 3 === 0 ? ["Hindi", "English"] : ["Hindi"],
    clothing: "Blue jeans, white t-shirt, black sneakers",
    marks: i % 5 === 0 ? "Birthmark on right forearm" : "—",
    guardianName: seedName(i + 91),
    guardianPhone: `+91 9${(100000000 + i * 17).toString().slice(0, 9)}`,
    aadhaar: `XXXX-XXXX-${(1000 + i * 7).toString().slice(-4)}`,
    tags: priority === "critical" ? ["Vulnerable", "Priority"] : [],
    caseNotes: [],
  };
});

export const MOCK_FOUND = Array.from({ length: 12 }, (_, i) => {
  const gender = genders[(i + 1) % 2];
  const city = cities[(i + 3) % cities.length];
  return {
    id: `FP-${2025000 + i}`,
    approxAge: 8 + ((i * 9) % 70),
    gender,
    photo: seedAvatar(i + 22, gender),
    foundCity: city.name,
    lat: city.lat,
    lng: city.lng,
    foundAt: daysAgo((i * 2 + 1) % 30),
    condition: i % 3 === 0 ? "Disoriented, in need of medical attention" : "Physically stable",
    description: "Seen near a market area, appeared lost. Non-communicative.",
    nearbyStation: `${city.name} Central Police Station`,
    nearbyHospital: `${city.name} General Hospital`,
    reporter: "Public User",
    matched: i % 4 === 0,
    matchId: i % 4 === 0 ? `MP-${2025000 + i}` : null,
  };
});

export const MOCK_SIGHTINGS = Array.from({ length: 10 }, (_, i) => {
  const city = cities[i % cities.length];
  return {
    id: `SGT-${1000 + i}`,
    personId: `MP-${2025000 + (i % 24)}`,
    location: `${city.name}, near ${["Railway Station","Bus Stand","Market","Temple","Park"][i%5]}`,
    lat: city.lat, lng: city.lng,
    date: daysAgo(i),
    reporter: i % 2 === 0 ? "Anonymous" : seedName(i + 55),
    reliability: 40 + ((i * 17) % 55),
    notes: "Saw a person matching the description near the location for a few minutes.",
    photo: null,
    anonymous: i % 2 === 0,
    reward: i % 3 === 0,
  };
});

export const MOCK_AI_MATCHES = Array.from({ length: 8 }, (_, i) => {
  const person = MOCK_MISSING[i % MOCK_MISSING.length];
  const found = MOCK_FOUND[i % MOCK_FOUND.length];
  const overall = 55 + ((i * 9) % 42);
  return {
    id: `AIM-${800 + i}`,
    missing: person,
    found,
    face: overall + ((i * 3) % 6) - 3,
    text: overall - 8 + ((i * 5) % 10),
    clothing: overall - 12 + ((i * 4) % 8),
    location: overall - 5 + ((i * 7) % 10),
    timeline: overall - 3 + ((i * 6) % 6),
    overall,
    status: overall > 90 ? "Emergency" : overall > 85 ? "Police Review" : overall > 70 ? "Manual Verify" : "Needs Evidence",
    reason: "Matched facial landmarks (eye distance, jawline), similar clothing tone, and geographic proximity within 12 km.",
    createdAt: daysAgo(i),
  };
});

export const MOCK_AUDIT_LOGS = Array.from({ length: 30 }, (_, i) => ({
  id: `LOG-${10000 + i}`,
  timestamp: daysAgo(i * 0.1),
  role: ["public", "police", "hospital", "ngo", "admin"][i % 5],
  actor: seedName(i + 5),
  action: [
    "LOGIN",
    "REPORT_CREATED",
    "AI_MATCH_VIEWED",
    "SIGHTING_SUBMITTED",
    "EVIDENCE_UPLOADED",
    "CASE_UPDATED",
    "APPROVAL_GRANTED",
    "PROFILE_UPDATED",
  ][i % 8],
  caseId: `MP-${2025000 + (i % 24)}`,
  ip: `10.${i % 255}.${(i * 3) % 255}.${(i * 7) % 255}`,
  device: i % 2 === 0 ? "Desktop / Chrome" : "Mobile / Safari",
  location: cities[i % cities.length].name,
}));

export const MOCK_HOSPITAL_PATIENTS = Array.from({ length: 8 }, (_, i) => {
  const city = cities[i % cities.length];
  const gender = genders[i % 2];
  return {
    id: `HP-${5000 + i}`,
    approxAge: 20 + ((i * 7) % 60),
    gender,
    photo: seedAvatar(i + 40, gender),
    admittedAt: daysAgo(i),
    department: ["Trauma","General","Neurology","Psychiatry"][i % 4],
    condition: ["Stable","Critical","Serious","Recovering"][i % 4],
    hospital: `${city.name} General Hospital`,
    notes: "Brought in unconscious, no identification documents.",
    aiMatched: i % 3 === 0,
  };
});

export const MOCK_SHELTER_RESIDENTS = Array.from({ length: 8 }, (_, i) => {
  const city = cities[(i + 2) % cities.length];
  const gender = genders[(i + 1) % 2];
  return {
    id: `SR-${7000 + i}`,
    approxAge: 15 + ((i * 5) % 65),
    gender,
    photo: seedAvatar(i + 55, gender),
    intakeAt: daysAgo(i + 2),
    shelter: `${city.name} Care Home`,
    medical: i % 3 === 0 ? "Requires medication" : "None",
    notes: "Found wandering, brought in by local volunteers.",
  };
});

export const MOCK_NOTIFICATIONS = [
  { id: 1, title: "Possible AI match found", body: "Case MP-2025007 has a 92% face match with a shelter resident.", time: "5 min ago", read: false, level: "high" },
  { id: 2, title: "Case updated", body: "Police added new evidence to MP-2025003.", time: "1 h ago", read: false, level: "info" },
  { id: 3, title: "Admin approval received", body: "Your closure request for MP-2024988 was approved.", time: "Yesterday", read: true, level: "ok" },
  { id: 4, title: "New sighting on your report", body: "A new sighting was submitted for MP-2025000.", time: "2 d ago", read: true, level: "info" },
];

export const MOCK_CCTV_CAMERAS = Array.from({ length: 9 }, (_, i) => {
  const city = cities[i % cities.length];
  const spot = ["Railway Station", "Bus Terminal", "Market Square", "Metro Station", "City Mall Entrance", "Highway Checkpoint", "Temple Complex", "Central Park", "ISBT Junction"][i % 9];
  return {
    id: `CAM-${401 + i}`,
    label: `${city.name} · ${spot}`,
    city: city.name,
    status: i % 7 === 3 ? "offline" : "live",
    resolution: i % 2 === 0 ? "4K" : "1080p",
    fps: 25,
  };
});

export const MOCK_CCTV_MATCHES = Array.from({ length: 6 }, (_, i) => {
  const person = MOCK_MISSING[(i * 5 + 2) % MOCK_MISSING.length];
  const camera = MOCK_CCTV_CAMERAS[(i * 2 + 1) % MOCK_CCTV_CAMERAS.length];
  const confidence = 61 + ((i * 13) % 37);
  return {
    id: `CCM-${901 + i}`,
    person,
    camera,
    confidence,
    capturedAt: daysAgo(i * 0.35),
    status: "pending",
  };
});

export function priorityBadgeClass(p) {
  return {
    critical: "badge-critical",
    high: "badge-high",
    medium: "badge-medium",
    low: "badge-low",
  }[p] || "badge-low";
}

export function confidenceBand(v) {
  if (v >= 95) {
    return {
      label: "Emergency Alert",
      color: "#dc2626",
    };
  }

  if (v >= 85) {
    return {
      label: "Police Review",
      color: "#ea580c",
    };
  }

  if (v >= 70) {
    return {
      label: "Manual Verify",
      color: "#f59e0b",
    };
  }

  if (v >= 50) {
    return {
      label: "Needs Evidence",
      color: "#2563eb",
    };
  }

  return {
    label: "Low Priority",
    color: "#6b7280",
  };
}

export function priorityColor(priority) {
  switch (priority) {
    case "critical":
      return "#dc2626"; // red
    case "high":
      return "#ea580c"; // orange
    case "medium":
      return "#f59e0b"; // yellow
    case "low":
      return "#22c55e"; // green
    default:
      return "#6b7280"; // gray
  }
}