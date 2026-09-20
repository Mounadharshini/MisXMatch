import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi, userApi, notificationApi, setTokens, clearTokens, getAccessToken, getRefreshToken } from "@/lib/api";

const AuthContext = createContext(null);

const SESSION_KEY = "misxmatch_auth_v1";

export const REGISTERABLE_ROLES = ["public", "police", "hospital", "ngo", "shelter"];

const ROLE_TO_BACKEND = {
  public: "PUBLIC_USER",
  police: "POLICE",
  hospital: "HOSPITAL",
  ngo: "NGO",
  shelter: "SHELTER",
};

const BACKEND_TO_ROLE = {
  PUBLIC_USER: "public",
  POLICE: "police",
  HOSPITAL: "hospital",
  NGO: "ngo",
  SHELTER: "ngo",
  ADMIN: "admin",
  SUPER_ADMIN: "admin",
};

function apiErrorMessage(err, fallback = "An unexpected error occurred.") {
  const backendMsg =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    (typeof err?.response?.data === "string" && err.response.data.length < 200 ? err.response.data : null);

  if (backendMsg) return backendMsg;

  if (err?.response?.status === 401) {
    return "Invalid credentials. Please check your user ID / email and password.";
  }
  if (err?.response?.status === 403) {
    return "Access forbidden or session expired. Please verify your credentials or sign in again.";
  }
  if (err?.response?.status === 400 || err?.response?.status === 409) {
    return fallback || "Invalid request or details already registered.";
  }
  if (err?.response?.status >= 500) {
    return "Internal server error. Please try again later.";
  }
  if (err?.code === "ERR_NETWORK" || err?.message === "Network Error") {
    return "Network connection issue: Unable to reach backend service. Please check your network and server status.";
  }

  return err?.message || fallback;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        (parsed.userId === "admin" ||
          parsed.id === "admin" ||
          parsed.email === "admin@agency.gov.in" ||
          parsed.role === "SUPER_ADMIN" ||
          parsed.isSuperAdmin === true ||
          parsed.superAdmin === true)
      ) {
        parsed.isSuperAdmin = true;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);

  const persistSession = (u) => {
    let finalUser = u;
    if (
      finalUser &&
      (finalUser.userId === "admin" ||
        finalUser.id === "admin" ||
        finalUser.email === "admin@agency.gov.in" ||
        finalUser.role === "SUPER_ADMIN" ||
        finalUser.isSuperAdmin === true ||
        finalUser.superAdmin === true)
    ) {
      finalUser = { ...finalUser, isSuperAdmin: true };
    }
    setUser(finalUser);
    try {
      if (finalUser) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(finalUser));
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // ignore
    }
  };

function getPhotoCacheKeys(u) {
  if (!u) return [];
  const keys = new Set();
  const rawList = [u.userId, u.id, u.email, u.name, u.fullName];
  rawList.forEach((k) => {
    if (k && typeof k === "string") {
      const clean = k.trim().toLowerCase();
      if (clean) {
        keys.add(clean);
        keys.add(clean.replace(/\s+/g, ""));
        keys.add(clean.replace(/\s+/g, "_"));
        if (clean.includes("@")) {
          keys.add(clean.split("@")[0]);
        }
      }
    }
  });
  return Array.from(keys);
}

function getCachedUserPhoto(u) {
  const keys = getPhotoCacheKeys(u);
  for (const k of keys) {
    try {
      const photo = localStorage.getItem(`misxmatch_user_photo_${k}`);
      if (photo && photo.trim() !== "") return photo;
    } catch {}
  }
  // Secondary fallback check
  try {
    const fallbackPhoto = localStorage.getItem("misxmatch_last_user_photo");
    const ownerList = (localStorage.getItem("misxmatch_last_user_photo_owner") || "").split(",");
    if (fallbackPhoto && fallbackPhoto.trim() !== "") {
      const hasMatch = keys.some((k) => ownerList.includes(k));
      if (hasMatch) return fallbackPhoto;
    }
  } catch {}
  return null;
}

function setCachedUserPhoto(u, photoUrl) {
  const keys = getPhotoCacheKeys(u);
  if (!keys.length) return;
  keys.forEach((k) => {
    try {
      if (photoUrl && photoUrl.trim() !== "") {
        localStorage.setItem(`misxmatch_user_photo_${k}`, photoUrl);
      } else {
        localStorage.removeItem(`misxmatch_user_photo_${k}`);
      }
    } catch {}
  });
  try {
    if (photoUrl && photoUrl.trim() !== "") {
      localStorage.setItem("misxmatch_last_user_photo", photoUrl);
      localStorage.setItem("misxmatch_last_user_photo_owner", keys.join(","));
    } else {
      localStorage.removeItem("misxmatch_last_user_photo");
      localStorage.removeItem("misxmatch_last_user_photo_owner");
    }
  } catch {}
}

function clearCachedUserPhoto(u) {
  const keys = getPhotoCacheKeys(u);
  keys.forEach((k) => {
    try {
      localStorage.removeItem(`misxmatch_user_photo_${k}`);
    } catch {}
  });
  try {
    localStorage.removeItem("misxmatch_last_user_photo");
    localStorage.removeItem("misxmatch_last_user_photo_owner");
  } catch {}
}

  // Rehydrate profile from backend user-service
  const hydrateProfile = async (base) => {
    if (!base) return base;
    const cachedPhoto = getCachedUserPhoto(base);
    let photo = base.profilePhotoUrl || cachedPhoto || (base.avatar && !base.avatar.includes("dicebear") ? base.avatar : null);

    if (getAccessToken()) {
      try {
        const { data } = await userApi.getMyProfile();
        if (data) {
          if (data.profilePhotoUrl && data.profilePhotoUrl.trim() !== "") {
            photo = data.profilePhotoUrl;
            setCachedUserPhoto(base, photo);
            setCachedUserPhoto(data, photo);
          } else if (cachedPhoto) {
            photo = cachedPhoto;
            setCachedUserPhoto(base, photo);
            setCachedUserPhoto(data, photo);
          }

          const seedName = data.fullName || base.fullName || base.name || base.userId;
          const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seedName)}`;
          const finalAvatar = photo || defaultAvatar;

          const isSuperAdminUser = !!(
            base.isSuperAdmin ||
            base.superAdmin ||
            base.role === "SUPER_ADMIN" ||
            base.userId?.toLowerCase() === "admin" ||
            base.id?.toLowerCase() === "admin" ||
            base.email?.toLowerCase() === "admin@agency.gov.in" ||
            data.role === "SUPER_ADMIN" ||
            data.superAdmin === true
          );

          const updated = {
            ...base,
            isSuperAdmin: isSuperAdminUser,
            name: data.fullName || base.name || base.userId,
            fullName: data.fullName || base.fullName || base.name || base.userId,
            email: data.email || base.email,
            phone: data.phone || base.phone || "",
            address: data.address || base.address || "",
            city: data.city || base.city || "",
            state: data.state || base.state || "",
            pincode: data.pincode || base.pincode || "",
            gender: data.gender || base.gender || "",
            dateOfBirth: data.dateOfBirth || base.dateOfBirth || "",
            bio: data.bio || base.bio || "",
            emergencyContactName: data.emergencyContactName || base.emergencyContactName || "",
            emergencyContactPhone: data.emergencyContactPhone || base.emergencyContactPhone || "",
            profilePhotoUrl: photo || null,
            aadhaarVerified: data.aadhaarVerified ?? base.aadhaarVerified ?? false,
            emailVerified: data.emailVerified ?? true,
            phoneVerified: data.phoneVerified ?? true,
            avatar: finalAvatar,
            meta: {
              phone: data.phone || "",
              address: data.address || "",
              city: data.city || "",
              state: data.state || "",
              pincode: data.pincode || "",
              gender: data.gender || "",
              dateOfBirth: data.dateOfBirth || "",
              bio: data.bio || "",
              emergencyContactName: data.emergencyContactName || "",
              emergencyContactPhone: data.emergencyContactPhone || "",
              profilePhotoUrl: photo || "",
              aadhaar: data.aadhaarNumber || data.aadhaar || "",
              ...(data.meta || {}),
            },
          };
          return updated;
        }
      } catch (err) {
        // Fallback to local session on error
      }
    }

    const isSuperAdminUser = !!(
      base.isSuperAdmin ||
      base.superAdmin ||
      base.role === "SUPER_ADMIN" ||
      base.userId?.toLowerCase() === "admin" ||
      base.id?.toLowerCase() === "admin" ||
      base.email?.toLowerCase() === "admin@agency.gov.in"
    );
    const seedName = base.fullName || base.name || base.userId;
    const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seedName)}`;
    return {
      ...base,
      isSuperAdmin: isSuperAdminUser,
      profilePhotoUrl: photo || null,
      avatar: photo || (base.avatar && !base.avatar.includes("dicebear") ? base.avatar : defaultAvatar),
    };
  };

  // Initial load hydration
  useEffect(() => {
    async function initAuth() {
      if (getAccessToken() && user) {
        try {
          const fresh = await hydrateProfile(user);
          persistSession(fresh);
        } catch {
          // keep existing cached session
        }
      }
      setLoading(false);
    }
    initAuth();
  }, []);

  const [deactivationRequests, setDeactivationRequests] = useState(() => {
    try {
      const raw = localStorage.getItem("misxmatch_deactivations");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [myReports, setMyReports] = useState([]);

  const persistDeactivations = (reqs) => {
    setDeactivationRequests(reqs);
    try {
      localStorage.setItem("misxmatch_deactivations", JSON.stringify(reqs));
    } catch {
      // ignore
    }
  };

  const requestDeactivation = (reason) => {
    if (!user) return { ok: false, error: "Must be logged in" };
    const isSuperAdminUser = !!(
      user.isSuperAdmin ||
      user.superAdmin ||
      user.role === "SUPER_ADMIN" ||
      user.userId?.toLowerCase() === "admin" ||
      user.id?.toLowerCase() === "admin" ||
      user.email?.toLowerCase() === "admin@agency.gov.in"
    );
    if (isSuperAdminUser) {
      return { ok: false, error: "The Super Admin account cannot be deactivated." };
    }
    const newReq = {
      id: "deact-" + Date.now(),
      userId: user.id || user.userId,
      userName: user.name || user.fullName || user.userId,
      userEmail: user.email || `${user.userId}@agency.gov.in`,
      role: user.role,
      reason: reason || "User requested account deactivation.",
      status: "pending",
      requestedAt: new Date().toISOString(),
      decidedBy: null,
      decidedAt: null,
      decisionNote: "",
    };
    const updated = [newReq, ...deactivationRequests.filter((r) => r.userId !== user.id)];
    persistDeactivations(updated);

    try {
      notificationApi.create({
        recipientUserId: "admin",
        title: "Account Deactivation Requested",
        message: `User ${user.name || user.userId} (${user.userId}) submitted an account deactivation request. Reason: ${newReq.reason}`,
        type: "SECURITY",
      });
    } catch {}

    return { ok: true, request: newReq };
  };

  const decideDeactivation = (id, decision, note = "") => {
    const targetReq = deactivationRequests.find((r) => r.id === id);
    const updated = deactivationRequests.map((r) =>
      r.id === id
        ? {
            ...r,
            status: decision,
            decidedBy: user?.name || user?.userId || "Super Admin",
            decidedAt: new Date().toISOString(),
            decisionNote: note,
          }
        : r
    );
    persistDeactivations(updated);

    if (targetReq?.userId) {
      try {
        notificationApi.create({
          recipientUserId: targetReq.userId,
          title: `Account Deactivation ${decision === "approved" ? "Approved" : "Rejected"}`,
          message: `Your account deactivation request was ${decision === "approved" ? "approved" : "rejected"} by the Super Admin.${note ? ` Note: ${note}` : ""}`,
          type: "SECURITY",
        });
      } catch {}
    }

    return { ok: true };
  };

function getResolvedUserId(identifier) {
  if (!identifier) return "";
  const clean = identifier.trim();
  const lower = clean.toLowerCase();
  const digitsOnly = clean.replace(/[\s-]/g, "");

  try {
    const raw = localStorage.getItem("misxmatch_user_directory");
    if (raw) {
      const dir = JSON.parse(raw);
      if (dir[lower]) return dir[lower];
      if (dir[digitsOnly]) return dir[digitsOnly];
    }
  } catch {
    // ignore
  }
  return clean;
}

function saveToUserDirectory(email, userId) {
  if (!email || !userId) return;
  try {
    const raw = localStorage.getItem("misxmatch_user_directory");
    const dir = raw ? JSON.parse(raw) : {};
    dir[email.trim().toLowerCase()] = userId.trim();
    localStorage.setItem("misxmatch_user_directory", JSON.stringify(dir));
  } catch {
    // ignore
  }
}

function saveToAadhaarDirectory(aadhaar, userId, email) {
  if (!aadhaar || !userId) return;
  const digitsOnly = aadhaar.replace(/[\s-]/g, "");
  if (!digitsOnly) return;
  try {
    const raw = localStorage.getItem("misxmatch_aadhaar_directory");
    const dir = raw ? JSON.parse(raw) : {};
    dir[digitsOnly] = userId.trim();
    localStorage.setItem("misxmatch_aadhaar_directory", JSON.stringify(dir));

    if (email) {
      saveToUserDirectory(digitsOnly, userId.trim());
      saveToUserDirectory(email, userId.trim());
    }
  } catch {
    // ignore
  }
}

  const login = async (identifier, password) => {
    clearTokens();
    const rawIdentifier = (identifier || "").trim();
    if (!rawIdentifier || !password) {
      return { ok: false, error: "Please enter your registered email, Aadhaar number, or user ID and password." };
    }

    const resolvedId = getResolvedUserId(rawIdentifier);
    const candidateIds = Array.from(new Set([resolvedId, rawIdentifier, rawIdentifier.split("@")[0], rawIdentifier.replace(/[\s-]/g, "")]));

    let lastError = null;

    for (const candidate of candidateIds) {
      try {
        const { data } = await authApi.login({ userId: candidate, password });
        setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });

        if (rawIdentifier.includes("@")) {
          saveToUserDirectory(rawIdentifier, data.userId || candidate);
        }

        const role = BACKEND_TO_ROLE[data.role] || (data.role?.toLowerCase() ?? "public");
        const candidateUserObj = { userId: data.userId, id: data.userId, email: data.email || (rawIdentifier.includes("@") ? rawIdentifier : null) };
        const cachedPhoto = getCachedUserPhoto(candidateUserObj);
        const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.userId)}`;

        const isVerified = data.aadhaarVerified ?? (data.role === "ADMIN" || data.role === "SUPER_ADMIN");

        let sessionUser = {
          id: data.userId,
          userId: data.userId,
          email: data.email || (rawIdentifier.includes("@") ? rawIdentifier : `${data.userId}@agency.gov.in`),
          role,
          isSuperAdmin: !!(data.role === "SUPER_ADMIN" || data.superAdmin === true || data.isSuperAdmin === true || data.userId === "admin"),
          name: data.fullName || data.userId,
          profilePhotoUrl: cachedPhoto || null,
          avatar: cachedPhoto || defaultAvatar,
          aadhaarVerified: isVerified,
          emailVerified: true,
          phoneVerified: true,
          meta: {},
        };

        sessionUser = await hydrateProfile(sessionUser);
        persistSession(sessionUser);

        return { ok: true, user: sessionUser };
      } catch (err) {
        lastError = err;
      }
    }

    return {
      ok: false,
      error: apiErrorMessage(
        lastError,
        "Invalid credentials. Please verify your email / Aadhaar / user ID and password, or create an account if you have not registered yet."
      ),
    };
  };

  const requestAadhaarOtp = async (aadhaarNumber) => {
    return sendAadhaarOtp(aadhaarNumber);
  };

  const sendAadhaarOtp = async (aadhaarNumber) => {
    const digitsOnly = (aadhaarNumber || "").replace(/[\s-]/g, "");
    if (digitsOnly.length !== 12) {
      return { ok: false, error: "Please enter a valid 12-digit Aadhaar Number." };
    }
    try {
      const { data } = await authApi.sendAadhaarOtp(digitsOnly);
      return {
        ok: true,
        txnId: data.txnId,
        maskedMobile: data.maskedMobile,
        maskedAadhaar: data.maskedAadhaar,
        mode: data.mode,
        message: data.message,
      };
    } catch (err) {
      return { ok: false, error: apiErrorMessage(err, "Failed to request Aadhaar OTP.") };
    }
  };

  const verifyAadhaarOtp = async (payload, otp) => {
    const reqPayload =
      typeof payload === "string"
        ? { aadhaarNumber: payload.replace(/[\s-]/g, ""), otp: String(otp).trim() }
        : payload;

    try {
      const { data } = await authApi.verifyAadhaarOtp(reqPayload);
      return {
        ok: true,
        verified: data.verified,
        verificationToken: data.verificationToken,
        maskedAadhaar: data.maskedAadhaar,
        message: data.message,
        authResponse: data.authResponse,
      };
    } catch (err) {
      return { ok: false, error: apiErrorMessage(err, "Invalid or expired Aadhaar OTP.") };
    }
  };

  const loginWithAadhaarOtp = async (aadhaarNumber, otp) => {
    clearTokens();
    const digitsOnly = (aadhaarNumber || "").replace(/[\s-]/g, "");
    if (digitsOnly.length !== 12) {
      return { ok: false, error: "Please enter a valid 12-digit Aadhaar Number." };
    }
    if (!otp || String(otp).trim().length !== 6) {
      return { ok: false, error: "Please enter the 6-digit Aadhaar OTP." };
    }

    try {
      const { data } = await authApi.verifyAadhaarOtp(digitsOnly, String(otp).trim());
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });

      const role = BACKEND_TO_ROLE[data.role] || (data.role?.toLowerCase() ?? "public");
      const candidateUserObj = { userId: data.userId, id: data.userId, email: data.email };
      const cachedPhoto = getCachedUserPhoto(candidateUserObj);
      const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.userId)}`;

      const isVerified = data.aadhaarVerified ?? true;

      let sessionUser = {
        id: data.userId,
        userId: data.userId,
        email: data.email || `${data.userId}@agency.gov.in`,
        role,
        isSuperAdmin: !!(data.role === "SUPER_ADMIN" || data.superAdmin === true || data.isSuperAdmin === true || data.userId === "admin"),
        name: data.fullName || data.userId,
        profilePhotoUrl: cachedPhoto || null,
        avatar: cachedPhoto || defaultAvatar,
        aadhaarVerified: isVerified,
        emailVerified: true,
        phoneVerified: true,
        meta: {},
      };

      sessionUser = await hydrateProfile(sessionUser);
      persistSession(sessionUser);

      return { ok: true, user: sessionUser };
    } catch (err) {
      return { ok: false, error: apiErrorMessage(err, "Invalid or expired Aadhaar OTP.") };
    }
  };

  const loginWithAadhaarPassword = async (aadhaarNumber, password) => {
    clearTokens();
    const digitsOnly = (aadhaarNumber || "").replace(/[\s-]/g, "");
    if (digitsOnly.length !== 12) {
      return { ok: false, error: "Please enter a valid 12-digit Aadhaar Number." };
    }
    if (!password) {
      return { ok: false, error: "Please enter your account password." };
    }

    try {
      const { data } = await authApi.loginWithAadhaarPassword(digitsOnly, password);
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });

      const role = BACKEND_TO_ROLE[data.role] || (data.role?.toLowerCase() ?? "public");
      const candidateUserObj = { userId: data.userId, id: data.userId, email: data.email };
      const cachedPhoto = getCachedUserPhoto(candidateUserObj);
      const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.userId)}`;

      const isVerified = data.aadhaarVerified ?? true;

      let sessionUser = {
        id: data.userId,
        userId: data.userId,
        email: data.email || `${data.userId}@agency.gov.in`,
        role,
        isSuperAdmin: !!(data.role === "SUPER_ADMIN" || data.superAdmin === true || data.isSuperAdmin === true || data.userId === "admin"),
        name: data.fullName || data.userId,
        profilePhotoUrl: cachedPhoto || null,
        avatar: cachedPhoto || defaultAvatar,
        aadhaarVerified: isVerified,
        emailVerified: true,
        phoneVerified: true,
        meta: {},
      };

      sessionUser = await hydrateProfile(sessionUser);
      persistSession(sessionUser);

      return { ok: true, user: sessionUser };
    } catch (err) {
      return { ok: false, error: apiErrorMessage(err, "Invalid Aadhaar number or password.") };
    }
  };

  const register = async (data) => {
    clearTokens();
    const roleKey = REGISTERABLE_ROLES.includes(data.role) ? data.role : "public";
    const chosenUserId = data.userId || (data.email ? data.email.split("@")[0] : `user_${Date.now()}`);
    try {
      const { data: auth } = await authApi.register({
        userId: chosenUserId,
        email: data.email,
        password: data.password,
        role: ROLE_TO_BACKEND[roleKey] || "PUBLIC_USER",
        fullName: data.fullName,
        phone: data.phone,
        aadhaarNumber: data.aadhaarNumber,
        aadhaarVerificationToken: data.aadhaarVerificationToken,
      });

      setTokens({ accessToken: auth.accessToken, refreshToken: auth.refreshToken });

      if (data.email && chosenUserId) {
        saveToUserDirectory(data.email, chosenUserId);
      }

      // If user provided name, phone or address, save to profile
      if (data.fullName || data.phone || data.address || data.orgName) {
        try {
          await userApi.updateMyProfile({
            fullName: data.fullName || data.orgName || "",
            phone: data.phone || "",
            address: data.address || "",
          });
        } catch {
          // non-critical
        }
      }

      // If institutional registration, submit organization details
      if (["police", "hospital", "ngo", "shelter"].includes(roleKey) && data.orgName) {
        try {
          await userApi.submitOrganization({
            orgName: data.orgName,
            orgType: roleKey.toUpperCase(),
            regNumber: data.regNumber || "REG-" + Date.now(),
            contactPerson: data.fullName || auth.userId,
            contactPhone: data.phone || "",
            address: data.address || "",
          });
        } catch {
          // non-critical
        }
      }

      const candidateUserObj = { userId: auth.userId, id: auth.userId, email: auth.email || data.email };
      const cachedPhoto = getCachedUserPhoto(candidateUserObj);
      const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.fullName || auth.userId)}`;

      let sessionUser = {
        id: auth.userId,
        userId: auth.userId,
        email: auth.email || data.email,
        role: roleKey,
        isSuperAdmin: false,
        name: data.fullName || data.orgName || auth.userId,
        profilePhotoUrl: cachedPhoto || null,
        avatar: cachedPhoto || defaultAvatar,
        aadhaarVerified: false,
        emailVerified: true,
        phoneVerified: true,
        meta: {
          phone: data.phone || "",
          address: data.address || "",
          orgName: data.orgName || "",
        },
      };

      sessionUser = await hydrateProfile(sessionUser);
      persistSession(sessionUser);
      return { ok: true, user: sessionUser, needsAadhaarVerification: true };
    } catch (err) {
      return { ok: false, error: apiErrorMessage(err, "Registration failed. Please verify your details.") };
    }
  };

  const logout = async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // ignore logout errors on client
      }
    }
    clearTokens();
    persistSession(null);
  };

  const verifyAadhaar = async (aadhaarNumber) => {
    try {
      const res = await userApi.verifyAadhaar(aadhaarNumber);
      const isVerified = !!(res?.data?.verified || res?.data?.status === "VERIFIED");
      if (isVerified) {
        const updated = {
          ...user,
          aadhaarVerified: true,
          meta: { ...(user?.meta || {}), aadhaar: aadhaarNumber },
        };
        persistSession(updated);
        return { ok: true };
      } else {
        const errMsg = res?.data?.message || "Aadhaar verification service is not configured.";
        const updated = {
          ...user,
          aadhaarVerified: false,
        };
        persistSession(updated);
        return { ok: false, error: errMsg };
      }
    } catch (err) {
      const errMsg = apiErrorMessage(err, "Aadhaar verification service is not configured.");
      const updated = {
        ...user,
        aadhaarVerified: false,
      };
      persistSession(updated);
      return { ok: false, error: errMsg };
    }
  };

  const updateProfile = async (fields) => {
    let photoInput = fields.profilePhotoUrl;
    if (photoInput === "" || photoInput === null) {
      clearCachedUserPhoto(user);
    } else if (photoInput && !photoInput.includes("dicebear")) {
      setCachedUserPhoto(user, photoInput);
    }

    const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fields.fullName || user?.fullName || user?.name || user?.userId)}`;

    try {
      const { data } = await userApi.updateMyProfile(fields);
      let photo;
      if (fields.profilePhotoUrl !== undefined) {
        photo = fields.profilePhotoUrl || null;
      } else {
        photo = data?.profilePhotoUrl || user?.profilePhotoUrl || getCachedUserPhoto(user);
      }

      if (photo) {
        setCachedUserPhoto(user, photo);
        setCachedUserPhoto(data, photo);
      } else if (fields.profilePhotoUrl === "" || fields.profilePhotoUrl === null) {
        clearCachedUserPhoto(user);
        clearCachedUserPhoto(data);
      }

      const updated = {
        ...user,
        ...fields,
        name: fields.fullName || user?.name,
        fullName: fields.fullName || user?.fullName || user?.name,
        profilePhotoUrl: photo || null,
        avatar: photo || fields.avatar || defaultAvatar,
        meta: { ...(user?.meta || {}), ...fields, profilePhotoUrl: photo || "" },
      };
      persistSession(updated);
      return { ok: true, profile: updated };
    } catch (err) {
      let photo;
      if (fields.profilePhotoUrl !== undefined) {
        photo = fields.profilePhotoUrl || null;
      } else {
        photo = user?.profilePhotoUrl || getCachedUserPhoto(user);
      }

      if (photo) {
        setCachedUserPhoto(user, photo);
      } else if (fields.profilePhotoUrl === "" || fields.profilePhotoUrl === null) {
        clearCachedUserPhoto(user);
      }

      const updated = {
        ...user,
        ...fields,
        name: fields.fullName || user?.name,
        fullName: fields.fullName || user?.fullName || user?.name,
        profilePhotoUrl: photo || null,
        avatar: photo || fields.avatar || defaultAvatar,
        meta: { ...(user?.meta || {}), ...fields, profilePhotoUrl: photo || "" },
      };
      persistSession(updated);
      return { ok: true, profile: updated };
    }
  };

  const log = useCallback((action, meta = {}) => {
    // Fire and forget audit entry if needed
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        requestAadhaarOtp,
        sendAadhaarOtp,
        verifyAadhaarOtp,
        loginWithAadhaarOtp,
        loginWithAadhaarPassword,
        saveToAadhaarDirectory,
        register,
        logout,
        verifyAadhaar,
        updateProfile,
        deactivationRequests,
        requestDeactivation,
        decideDeactivation,
        myReports,
        setMyReports,
        logs,
        log,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
