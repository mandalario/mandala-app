import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LanguageProvider } from "@/i18n/LanguageContext";
import {
  userHasOAuthLogin,
  userHasPasswordLogin,
  userSkippedSetPassword,
} from "@/lib/auth";
import { isReactNativeWebView } from "@/lib/nativeApp";
import { BottomNav } from "@/components/BottomNav";
import { PushNotificationManager } from "@/components/PushNotificationManager";
import { OceanBackground } from "@/components/OceanBackground";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import PendingApproval from "./pages/PendingApproval.tsx";
import ForceSetPassword from "./pages/ForceSetPassword.tsx";
import Packages from "./pages/Packages.tsx";
import BuyClasses from "./pages/BuyClasses.tsx";
import Schedule from "./pages/Schedule.tsx";
import Feed from "./pages/Feed.tsx";
import Chat from "./pages/Chat.tsx";
import AdminLayout from "./pages/admin/AdminLayout.tsx";
import AdminDashboardHome from "./pages/admin/AdminDashboardHome.tsx";
import AdminStudents from "./pages/admin/AdminStudents.tsx";
import AdminSchedule from "./pages/admin/AdminSchedule.tsx";
import AdminBookingRefunds from "./pages/admin/AdminBookingRefunds.tsx";
import AdminBilling from "./pages/admin/AdminBilling.tsx";
import AdminPackages from "./pages/admin/AdminPackages.tsx";
import AdminPosts from "./pages/admin/AdminPosts.tsx";
import AdminTerms from "./pages/admin/AdminTerms.tsx";
import AdminPrivacy from "./pages/admin/AdminPrivacy.tsx";
import LegalPage from "./pages/LegalPage.tsx";
import AdminChatList from "./pages/admin/AdminChatList.tsx";
import AdminContent from "./pages/admin/AdminContent.tsx";
import AdminNotifications from "./pages/admin/AdminNotifications.tsx";
import AdminForecast from "./pages/admin/AdminForecast.tsx";
import AdminAccess from "./pages/admin/AdminAccess.tsx";
import AdminTeachers from "./pages/admin/AdminTeachers.tsx";
import TeacherRatings from "./pages/TeacherRatings.tsx";
import Profile from "./pages/Profile.tsx";
import Support from "./pages/Support.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const PUBLIC_PATHS = ["/auth", "/auth/callback", "/terms", "/privacy", "/support", "/chat"];
const AUTH_ONLY_PATHS = ["/auth", "/onboarding", "/pending", "/set-password"];
const SUPPORT_PATHS = ["/support", "/chat"];

const PageLoader = () => (
  <div className="relative min-h-screen flex items-center justify-center">
    <OceanBackground />
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

function useAccessRedirect(): { loading: boolean; redirectTo: string | null } {
  const { user, isAdmin, isGuest, profile, loading } = useAuth();
  const location = useLocation();
  const path = location.pathname;
  const isPublicPath = PUBLIC_PATHS.includes(path);

  if (loading) return { loading: true, redirectTo: null };

  if (!user) {
    return { loading: false, redirectTo: isPublicPath ? null : "/auth" };
  }

  if (isGuest) {
    const guestPaths = ["/support", "/chat", "/auth", "/auth/callback", "/terms", "/privacy"];
    if (guestPaths.includes(path)) return { loading: false, redirectTo: null };
    return { loading: false, redirectTo: "/support" };
  }

  if (isAdmin) {
    if (AUTH_ONLY_PATHS.includes(path)) return { loading: false, redirectTo: "/admin" };
    return { loading: false, redirectTo: null };
  }

  if (!profile) return { loading: true, redirectTo: null };

  const mustSetPasswordFirst =
    !isReactNativeWebView() &&
    userHasOAuthLogin(user) &&
    !userHasPasswordLogin(user) &&
    !userSkippedSetPassword(user);
  if (mustSetPasswordFirst) {
    if (path !== "/set-password" && !isPublicPath) {
      return { loading: false, redirectTo: "/set-password" };
    }
    return { loading: false, redirectTo: null };
  }

  if (!profile.profile_completed) {
    if (path !== "/onboarding" && !isPublicPath && !SUPPORT_PATHS.includes(path)) {
      return { loading: false, redirectTo: "/onboarding" };
    }
    return { loading: false, redirectTo: null };
  }

  if (profile.approval_status !== "approved") {
    if (path !== "/pending" && !isPublicPath && !SUPPORT_PATHS.includes(path)) {
      return { loading: false, redirectTo: "/pending" };
    }
    return { loading: false, redirectTo: null };
  }

  if (AUTH_ONLY_PATHS.includes(path)) {
    return { loading: false, redirectTo: "/" };
  }

  return { loading: false, redirectTo: null };
}

const ConditionalBottomNav = () => {
  const { user, isAdmin, profile, loading } = useAuth();
  const location = useLocation();

  if (loading || !user || isAdmin) return null;

  const hidePaths = ["/auth", "/onboarding", "/pending", "/chat", "/set-password"];
  if (hidePaths.includes(location.pathname)) return null;
  if (location.pathname.startsWith("/admin")) return null;
  if (profile?.approval_status !== "approved") return null;

  return <BottomNav />;
};

function AppRoutes() {
  const location = useLocation();

  // Intercepta qualquer entrada com tokens de sessão ou OAuth code para autenticar na hora
  if (
    location.pathname !== "/auth/callback" &&
    (location.search.includes("access_token") ||
      location.hash.includes("access_token") ||
      location.search.includes("code="))
  ) {
    return <Navigate to={`/auth/callback${location.search}${location.hash}`} replace />;
  }

  const { loading, redirectTo } = useAccessRedirect();

  if (loading) return <PageLoader />;
  if (redirectTo && redirectTo !== location.pathname) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/set-password" element={<ForceSetPassword />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/pending" element={<PendingApproval />} />
        <Route path="/packages" element={<Packages />} />
        <Route path="/adquirir-aulas" element={<BuyClasses />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/support" element={<Support />} />
        <Route path="/teachers" element={<TeacherRatings />} />
        <Route path="/terms" element={<LegalPage kind="terms" />} />
        <Route path="/privacy" element={<LegalPage kind="privacy" />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardHome />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="schedule" element={<AdminSchedule />} />
          <Route path="refunds" element={<AdminBookingRefunds />} />
          <Route path="forecast" element={<AdminForecast />} />
          <Route path="billing" element={<AdminBilling />} />
          <Route path="packages" element={<AdminPackages />} />
          <Route path="content" element={<AdminContent />} />
          <Route path="posts" element={<AdminPosts />} />
          <Route path="terms" element={<AdminTerms />} />
          <Route path="privacy" element={<AdminPrivacy />} />
          <Route path="chat" element={<AdminChatList />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="access" element={<AdminAccess />} />
          <Route path="teachers" element={<AdminTeachers />} />
        </Route>
        <Route path="/admin/chat/conv" element={<Chat />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      <ConditionalBottomNav />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AuthProvider>
            <PushNotificationManager />
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
