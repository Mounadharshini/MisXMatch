import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ToastProvider } from "@/context/ToastContext";

import PublicLayout from "@/components/layout/PublicLayout";
import DashboardLayout from "@/components/layout/DashboardLayout";

import Home from "@/pages/public/Home";
import About from "@/pages/public/About";
import HowItWorks from "@/pages/public/HowItWorks";
import AIFeatures from "@/pages/public/AIFeatures";
import SuccessStories from "@/pages/public/SuccessStories";
import Statistics from "@/pages/public/Statistics";
import FAQ from "@/pages/public/FAQ";
import Contact from "@/pages/public/Contact";
import Privacy from "@/pages/public/Privacy";
import Terms from "@/pages/public/Terms";

import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import OTPVerify from "@/pages/auth/OTPVerify";
import AadhaarVerify from "@/pages/auth/AadhaarVerify";

import UserDashboard from "@/pages/user/UserDashboard";
import ReportMissing from "@/pages/user/ReportMissing";
import ReportFound from "@/pages/user/ReportFound";
import MyReports from "@/pages/user/MyReports";
import TrackCases from "@/pages/user/TrackCases";
import Directory from "@/pages/user/Directory";
import PersonProfile from "@/pages/user/PersonProfile";
import SubmitSighting from "@/pages/user/SubmitSighting";
import Notifications from "@/pages/user/Notifications";
import Profile from "@/pages/user/Profile";
import Settings from "@/pages/user/Settings";

import HospitalDashboard from "@/pages/hospital/HospitalDashboard";
import UnknownPatients from "@/pages/hospital/UnknownPatients";
import AddPatient from "@/pages/hospital/AddPatient";
import HospitalMatches from "@/pages/hospital/HospitalMatches";

import NGODashboard from "@/pages/ngo/NGODashboard";
import ShelterResidents from "@/pages/ngo/ShelterResidents";
import AddResident from "@/pages/ngo/AddResident";

import PoliceDashboard from "@/pages/police/PoliceDashboard";
import AllCases from "@/pages/police/AllCases";
import CaseDetails from "@/pages/police/CaseDetails";
import AIMatches from "@/pages/police/AIMatches";
import Sightings from "@/pages/police/Sightings";
import Evidence from "@/pages/police/Evidence";
import Analytics from "@/pages/police/Analytics";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import Approvals from "@/pages/admin/Approvals";
import UserManagement from "@/pages/admin/UserManagement";
import AuditLogs from "@/pages/admin/AuditLogs";
import SystemAnalytics from "@/pages/admin/SystemAnalytics";
import CaseClosureQueue from "@/pages/admin/CaseClosureQueue";
import CCTVAnalysis from "@/pages/shared/CCTVAnalysis";

function Protected({ roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.aadhaarVerified) return <Navigate to="/verify-aadhaar" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function DashboardRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.aadhaarVerified) return <Navigate to="/verify-aadhaar" replace />;
  const map = {
    public: "/app",
    hospital: "/hospital",
    ngo: "/ngo",
    police: "/police",
    admin: "/admin",
  };
  return <Navigate to={map[user.role] || "/app"} replace />;
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-navy-700">404</h1>
        <p className="mt-2 text-muted">Page not found.</p>
        <a href="/" className="btn btn-primary mt-6 inline-flex">Return home</a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
        <ToastProvider>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/ai-features" element={<AIFeatures />} />
              <Route path="/success-stories" element={<SuccessStories />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
            </Route>

            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-otp" element={<OTPVerify />} />
            <Route path="/verify-aadhaar" element={<AadhaarVerify />} />

            <Route path="/dashboard" element={<DashboardRedirect />} />

            {/* Public user */}
            <Route element={<Protected roles={["public"]} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/app" element={<UserDashboard />} />
                <Route path="/app/report-missing" element={<ReportMissing />} />
                <Route path="/app/report-found" element={<ReportFound />} />
                <Route path="/app/my-reports" element={<MyReports />} />
                <Route path="/app/track" element={<TrackCases />} />
                <Route path="/app/directory" element={<Directory />} />
                <Route path="/app/person/:id" element={<PersonProfile />} />
                <Route path="/app/sighting/:id?" element={<SubmitSighting />} />
                <Route path="/app/notifications" element={<Notifications />} />
                <Route path="/app/profile" element={<Profile />} />
                <Route path="/app/settings" element={<Settings />} />
              </Route>
            </Route>

            {/* Hospital */}
            <Route element={<Protected roles={["hospital"]} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/hospital" element={<HospitalDashboard />} />
                <Route path="/hospital/patients" element={<UnknownPatients />} />
                <Route path="/hospital/patients/new" element={<AddPatient />} />
                <Route path="/hospital/matches" element={<HospitalMatches />} />
                <Route path="/hospital/notifications" element={<Notifications />} />
                <Route path="/hospital/profile" element={<Profile />} />
                <Route path="/hospital/settings" element={<Settings />} />
              </Route>
            </Route>

            {/* NGO */}
            <Route element={<Protected roles={["ngo"]} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/ngo" element={<NGODashboard />} />
                <Route path="/ngo/residents" element={<ShelterResidents />} />
                <Route path="/ngo/residents/new" element={<AddResident />} />
                <Route path="/ngo/matches" element={<HospitalMatches />} />
                <Route path="/ngo/notifications" element={<Notifications />} />
                <Route path="/ngo/profile" element={<Profile />} />
                <Route path="/ngo/settings" element={<Settings />} />
              </Route>
            </Route>

            {/* Police */}
            <Route element={<Protected roles={["police"]} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/police" element={<PoliceDashboard />} />
                <Route path="/police/cases" element={<AllCases />} />
                <Route path="/police/cases/:id" element={<CaseDetails />} />
                <Route path="/police/matches" element={<AIMatches />} />
                <Route path="/police/cctv" element={<CCTVAnalysis />} />
                <Route path="/police/sightings" element={<Sightings />} />
                <Route path="/police/evidence" element={<Evidence />} />
                <Route path="/police/analytics" element={<Analytics />} />
                <Route path="/police/notifications" element={<Notifications />} />
                <Route path="/police/profile" element={<Profile />} />
                <Route path="/police/settings" element={<Settings />} />
              </Route>
            </Route>

            {/* Admin */}
            <Route element={<Protected roles={["admin"]} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/approvals" element={<Approvals />} />
                <Route path="/admin/users" element={<UserManagement />} />
                <Route path="/admin/audit" element={<AuditLogs />} />
                <Route path="/admin/analytics" element={<SystemAnalytics />} />
                <Route path="/admin/closures" element={<CaseClosureQueue />} />
                <Route path="/admin/cctv" element={<CCTVAnalysis />} />
                <Route path="/admin/notifications" element={<Notifications />} />
                <Route path="/admin/profile" element={<Profile />} />
                <Route path="/admin/settings" element={<Settings />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </ToastProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
