import axios from "axios";

// Central API Gateway entry point (default: /api, proxied by Vite dev or Nginx prod)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const ACCESS_TOKEN_KEY = "misxmatch_access_token";
const REFRESH_TOKEN_KEY = "misxmatch_refresh_token";

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens({ accessToken, refreshToken }) {
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Request Interceptor: Attach JWT Bearer token & X-User-Id header
api.interceptors.request.use(
  (config) => {
    const url = config.url || "";
    const isAuthRoute = url.startsWith("/auth/") && !url.startsWith("/auth/super-admin");

    if (isAuthRoute) {
      if (config.headers) {
        delete config.headers.Authorization;
        delete config.headers["X-User-Id"];
        delete config.headers["X-User-Role"];
        delete config.headers["X-Username"];
      }
      return config;
    }

    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    try {
      const userRaw = localStorage.getItem("misxmatch_auth_v1") || localStorage.getItem("misxmatch_user") || localStorage.getItem("user");
      if (userRaw) {
        const u = JSON.parse(userRaw);
        const uid = u?.userId || u?.id || u?.email || u?.username;
        if (uid && !config.headers["X-User-Id"]) {
          config.headers["X-User-Id"] = String(uid);
        }
      }
    } catch (e) {}
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto-refresh token on 401
let refreshInFlight = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthRoute = original?.url?.includes("/auth/login") || original?.url?.includes("/auth/register") || original?.url?.includes("/auth/refresh");
    if (error.response?.status === 401 && !original._retry && getRefreshToken() && !isAuthRoute) {
      original._retry = true;
      try {
        refreshInFlight =
          refreshInFlight ||
          axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: getRefreshToken() });
        const { data } = await refreshInFlight;
        refreshInFlight = null;
        setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshError) {
        refreshInFlight = null;
        clearTokens();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// Normalize parameter argument (string vs object)
const toParams = (arg, defaultKey = "q") => {
  if (!arg) return {};
  if (typeof arg === "string") return { [defaultKey]: arg };
  return arg;
};

// ---- Authentication & Identity APIs ----
export const authApi = {
  login: (payload) => api.post("/auth/login", payload),
  sendAadhaarOtp: (aadhaarNumber) => api.post("/auth/aadhaar/send-otp", { aadhaarNumber }),
  requestAadhaarOtp: (aadhaarNumber) => api.post("/auth/aadhaar/send-otp", { aadhaarNumber }),
  verifyAadhaarOtp: (payload, otp) => {
    if (typeof payload === "string") {
      return api.post("/auth/aadhaar/verify-otp", { aadhaarNumber: payload, otp });
    }
    return api.post("/auth/aadhaar/verify-otp", payload);
  },
  getAadhaarProviderMode: () => api.get("/auth/aadhaar/provider-mode"),
  loginWithAadhaarPassword: (aadhaarNumber, password) => api.post("/auth/aadhaar/login-password", { aadhaarNumber, password }),
  register: (payload) => api.post("/auth/register", payload),
  logout: (refreshToken) => api.post("/auth/logout", { refreshToken }),
  refresh: (refreshToken) => api.post("/auth/refresh", { refreshToken }),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
  resendResetOtp: (email) => api.post("/auth/forgot-password/resend-otp", { email }),
  verifyResetOtp: (emailOrPayload, maybeOtp) => {
    if (typeof emailOrPayload === "string") {
      return api.post("/auth/forgot-password/verify-otp", { email: emailOrPayload, otp: maybeOtp });
    }
    return api.post("/auth/forgot-password/verify-otp", emailOrPayload);
  },
  resetPassword: (payload) => api.post("/auth/reset-password", payload),
  validateResetToken: (token) => api.get("/auth/validate-reset-token", { params: { token } }),
  createAdmin: (payload) => api.post("/auth/super-admin/create-admin", payload),
  listAdmins: (params) => api.get("/auth/super-admin/admins", { params: toParams(params) }),
  userStatsByRole: () => api.get("/auth/admin/stats"),
  deleteAdmin: (adminUserId) => api.delete(`/auth/super-admin/admin/${adminUserId}`),
  resetAdminPassword: (adminUserId) => api.post(`/auth/super-admin/admin/${adminUserId}/reset-password`),
};

// ---- Mobile OTP APIs ----
export const otpApi = {
  sendOtp: (mobile) => api.post("/auth/send-otp", { mobile }),
  verifyOtp: (mobile, otp) => api.post("/auth/verify-otp", { mobile, otp }),
  resendOtp: (mobile) => api.post("/auth/resend-otp", { mobile }),
};

// ---- User Profile & Verification APIs ----
export const userApi = {
  getMyProfile: () => api.get("/users/profile"),
  updateMyProfile: (payload) => api.put("/users/profile", payload),
  getUserById: (id) => api.get(`/users/${id}`),
  deleteUser: (id) => api.delete(`/users/${id}`),
  verifyAadhaar: (aadhaarNumber) => api.post("/aadhaar/verify", { aadhaarNumber }),
  submitOrganization: (payload) => api.post("/users/organization", payload),
  getMyOrganization: () => api.get("/users/organization"),
  listUsers: (params) => api.get("/admin/users", { params: toParams(params) }),
  updateUserStatus: (userId, enabled) => api.put(`/admin/users/${userId}/status`, { enabled }),
  deactivateUser: (userId, { reason, evidenceRef }) => api.post(`/admin/users/${userId}/deactivate`, { reason, evidenceRef }),
  reactivateUser: (userId, { reason }) => api.post(`/admin/users/${userId}/reactivate`, { reason }),
};

// ---- Organization Verification APIs (Admin & Directory) ----
export const orgApi = {
  listAll: (params) => api.get("/users/organizations", { params: toParams(params, "orgType") }),
  listPending: (params) => api.get("/admin/organizations/pending", { params: toParams(params) }),
  approve: (userId) => api.post(`/admin/organizations/${userId}/approve`),
  reject: (userId) => api.post(`/admin/organizations/${userId}/reject`),
};

// ---- Case Management & AI Vision APIs ----
export const caseApi = {
  reportMissing: (payload) => api.post("/cases/missing", payload),
  listMissing: (params) => api.get("/cases/missing", { params: toParams(params, "reportedBy") }),
  getMissing: (id) => api.get(`/cases/missing/${id}`),
  updateMissing: (id, payload) => api.put(`/cases/missing/${id}`, payload),
  updateMissingStatus: (id, status) => api.put(`/cases/missing/${id}/status`, { status }),
  deleteMissing: (id) => api.delete(`/cases/missing/${id}`),
  reportFound: (payload) => api.post("/cases/found", payload),
  listFound: (params) => api.get("/cases/found", { params: toParams(params, "category") }),
  getFound: (id) => api.get(`/cases/found/${id}`),
  reportSighting: (payload) => api.post("/cases/sighting", payload),
  listSightings: (params) => api.get("/cases/sightings", { params: toParams(params) }),
  listMyReports: (params) => api.get("/reports/my", { params: toParams(params) }),
  getMyReports: () => api.get("/reports/my"),
  verifySighting: (id) => api.put(`/cases/sightings/${id}/verify`),
  dismissSighting: (id) => api.delete(`/cases/sightings/${id}`),
  matchImage: (payload) => api.post("/cases/match/image", payload),
  matchText: (payload) => api.post("/cases/match/text", payload),
  getStatus: (caseNumber) => api.get(`/cases/status/${caseNumber}`),
  getStats: () => api.get("/cases/stats"),
  getActiveCases: (params) => api.get("/cases/active", { params: toParams(params) }),
  listMatches: (params) => api.get("/cases/matches", { params: toParams(params) }),
  getMatchesForReport: (caseNumber) => api.get(`/cases/matches/report/${caseNumber}`),
  // CCTV Surveillance & Investigation Module
  listCameras: (params) => api.get("/cases/cctv/cameras", { params: toParams(params) }),
  createCamera: (payload) => api.post("/cases/cctv/cameras", payload),
  updateCamera: (id, payload) => api.put(`/cases/cctv/cameras/${id}`, payload),
  deleteCamera: (id) => api.delete(`/cases/cctv/cameras/${id}`),
  toggleCameraStatus: (id, status) => api.post(`/cases/cctv/cameras/${id}/status`, null, { params: { status } }),
  analyzeCctvMedia: (formData) => api.post("/cases/cctv/analyze", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  analyzeCctvCrop: (payload) => api.post("/cases/cctv/analyze-crop", payload),
  searchCctvTimeline: (payload) => api.post("/cases/cctv/timeline-search", payload),
  saveCctvLead: (payload) => api.post("/cases/cctv/leads", payload),
  listCctvLeads: () => api.get("/cases/cctv/leads"),
  listCctvHistory: () => api.get("/cases/cctv/history"),
  // Case Evidence
  uploadEvidence: (payload) => api.post("/cases/evidence", payload),
  listEvidence: (params) => api.get("/cases/evidence", { params: toParams(params) }),
  listEvidenceForCase: (caseNumber, params) => api.get(`/cases/evidence/case/${caseNumber}`, { params: toParams(params) }),
  deleteEvidence: (id) => api.delete(`/cases/evidence/${id}`),
  // Real File Upload APIs
  uploadFile: (file, folder = "uploads") => {
    const formData = new FormData();
    formData.append("file", file);
    if (folder) formData.append("folder", folder);
    return api.post("/cases/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
  },
  uploadMissingPhoto: (id, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/cases/missing/${id}/photo`, formData, { headers: { "Content-Type": "multipart/form-data" } });
  },
  uploadFoundPhoto: (id, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/cases/found/${id}/photo`, formData, { headers: { "Content-Type": "multipart/form-data" } });
  },
  uploadEvidenceFile: (file, caseNumber, metadata = {}) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("caseNumber", caseNumber);
    if (metadata.title) formData.append("title", metadata.title);
    if (metadata.category) formData.append("category", metadata.category);
    if (metadata.location) formData.append("location", metadata.location);
    if (metadata.seizureDate) formData.append("seizureDate", metadata.seizureDate);
    if (metadata.description) formData.append("description", metadata.description);
    if (metadata.officerName) formData.append("officerName", metadata.officerName);
    if (metadata.badgeNumber) formData.append("badgeNumber", metadata.badgeNumber);
    return api.post("/cases/evidence/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
  },
  // AI Intelligence Modules
  searchNlp: (payload) => api.post("/cases/ai/search-nlp", payload),
  extractOcr: (payload) => api.post("/cases/ai/ocr", payload),
  detectDuplicate: (payload) => api.post("/cases/ai/detect-duplicate", payload),
  assessRisk: (id) => api.get(`/cases/ai/assess-risk/${id}`),
  getRiskQueue: (params) => api.get("/cases/ai/risk-queue", { params: toParams(params) }),
  reviewMatch: (id, payload) => api.put(`/cases/matches/${id}/review`, payload),
  retriggerAllMatches: () => api.post("/cases/matches/retrigger-all"),
  // AI Safety & Quality Gate APIs
  getAiSafetyLead: (sourceCaseNumber, targetCaseNumber) =>
    api.get("/cases/ai/safety/candidate-explanation", { params: { sourceCaseNumber, targetCaseNumber } }),
  generateAiSafetyLead: (payload) =>
    api.post("/cases/ai/safety/candidate-explanation", payload),
  getAiQualityAssessment: (caseId) =>
    api.get(`/cases/ai/safety/quality-assessment/${caseId}`),
  getAiSafetyMatches: () =>
    api.get("/cases/ai/safety/matches"),
  // Evidence-Based Verification & Multi-Stage Reunification Workflow
  submitVerificationEvidence: (caseNumber, formData) =>
    api.post(`/cases/${caseNumber}/verification/evidence`, formData, { headers: { "Content-Type": "multipart/form-data" } }),
  requestReunificationConfirmation: (caseNumber, params) =>
    api.post(`/cases/${caseNumber}/reunification/request`, null, { params: toParams(params) }),
  confirmReunification: (caseNumber, payload) =>
    api.post(`/cases/${caseNumber}/reunification/confirm`, payload),
  rejectReunification: (caseNumber, payload) =>
    api.post(`/cases/${caseNumber}/reunification/reject`, payload),
  getReunificationDetails: (caseNumber) =>
    api.get(`/cases/${caseNumber}/reunification`),
  approveReunificationClosure: (caseNumber, payload) =>
    api.post(`/cases/${caseNumber}/reunification/approve-closure`, payload),
};

// ---- Dedicated AI Integration Service APIs ----
export const aiApi = {
  analyzeCase: (caseId) => api.post(`/ai/analyze-case/${caseId}`),
  analyzeUpload: (formData) => api.post("/ai/analyze-upload", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  getMatches: (caseId) => api.get(`/ai/matches/${caseId}`),
  getMatchDetail: (caseId, matchId) => api.get(`/ai/matches/${caseId}/${matchId}`),
  reviewMatch: (matchId, payload) => api.post(`/ai/matches/${matchId}/review`, payload),
  requestManualVerification: (matchId, payload) => api.post(`/ai/matches/${matchId}/manual-verification`, payload),
  getCasePriority: (caseId) => api.get(`/ai/case-priority/${caseId}`),
  getHealth: () => api.get("/ai/health"),
};

// ---- Real Python AI Microservice v2 Integration APIs (Step 8-10) ----
export const aiV2Api = {
  getHealth: () => api.get("/cases/ai/v2/health"),
  compareImages: (formData) => api.post("/cases/ai/v2/image-match", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  compareTexts: (payload) => api.post("/cases/ai/v2/text-match", payload),
  compareAttributes: (payload) => api.post("/cases/ai/v2/attribute-match", payload),
  compareLocations: (payload) => api.post("/cases/ai/v2/location-match", payload),
  compareTimes: (payload) => api.post("/cases/ai/v2/time-match", payload),
  compareMultiFactor: (payload) => api.post("/cases/ai/v2/multi-match", payload),
  calculateRiskScore: (payload) => api.post("/cases/ai/v2/risk-score", payload),
  evaluateAndSaveCaseRisk: (caseNumber) => api.post(`/cases/ai/v2/cases/${caseNumber}/risk-score`),
  evaluateCaseMultiMatch: (missingCaseNumber, targetCaseNumber) => api.post(`/cases/ai/v2/cases/${missingCaseNumber}/match/${targetCaseNumber}`),
  analyzeCaseCandidates: (caseId) => api.post(`/cases/ai/v2/cases/${caseId}/analyze`),
  getStoredMatches: (caseId) => api.get(`/cases/ai/v2/matches/${caseId}`),
  getMatchDetail: (matchId) => api.get(`/cases/ai/v2/matches/detail/${matchId}`),
  reviewMatch: (matchId, payload) => api.patch(`/cases/ai/v2/matches/${matchId}/review`, payload),
  getMatchHistory: (matchId) => api.get(`/cases/ai/v2/matches/${matchId}/history`),
  getTopMatch: (caseId) => api.get(`/cases/ai/v2/matches/${caseId}/top`),
  getLatestRisk: (caseId) => api.get(`/cases/ai/v2/risk/${caseId}`),
};

// ---- Notification, Dashboard & Audit APIs ----
export const notificationApi = {
  list: (params) => api.get("/notifications", { params: toParams(params) }),
  create: (payload) => api.post("/notifications", payload),
  broadcastEmergency: (payload) => api.post("/notifications/broadcast-emergency", payload),
  markRead: (id) => api.put(`/notifications/${id}`),
  remove: (id) => api.delete(`/notifications/${id}`),
  clearAll: () => api.delete("/notifications"),
  dashboard: (role) => api.get(`/dashboard/${role}`),
  auditLogs: (params) => api.get("/notifications/audit-logs", { params: toParams(params) }),
};

// ---- AI Evaluation & Calibration Admin APIs (Step 17) ----
export const aiEvaluationApi = {
  getDashboard: (faceThreshold = 0.75, textThreshold = 0.65) =>
    api.get(`/admin/ai/evaluation/dashboard?faceThreshold=${faceThreshold}&textThreshold=${textThreshold}`),
  getHumanReviewCorrelation: () => api.get("/admin/ai/evaluation/human-review"),
};

// ---- Case Intelligence & Decision-Support APIs (Step 18) ----
export const caseIntelligenceApi = {
  getIntelligence: (caseNumber) => api.get(`/cases/${caseNumber}/intelligence`),
};

// ---- Microservice Monitoring & System Health APIs (Step 19) ----
export const systemHealthApi = {
  getDetailedHealth: () => api.get("/admin/system/health"),
  getPublicHealth: () => api.get("/health"),
};

export default api;
