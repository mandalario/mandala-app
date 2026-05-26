import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { userHasOAuthLogin, userHasPasswordLogin } from "@/lib/auth";
import { useLocation } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { PushNotificationManager } from "@/components/PushNotificationManager";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import PendingApproval from "./pages/PendingApproval.tsx";
import ForceSetPassword from "./pages/ForceSetPassword.tsx";
import Packages from "./pages/Packages.tsx";
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
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const ConditionalBottomNav = () => {
  const { user, isAdmin, profile, loading } = useAuth();
  const location = useLocation();

  if (loading || !user || isAdmin) return null;
  
  const hidePaths = ["/auth", "/onboarding", "/pending", "/chat"];
  if (hidePaths.includes(location.pathname)) return null;
  if (location.pathname.startsWith("/admin")) return null;
  if (profile?.approval_status !== "approved") return null;

  return <BottomNav />;
};

const AppAccessGuard = () => {
  const { user, isAdmin, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  const publicPaths = ["/auth", "/terms", "/privacy"];
  const authOnlyPaths = ["/auth", "/onboarding", "/pending", "/set-password"];
  const isPublicPath = publicPaths.includes(location.pathname);

  if (!user) {
    if (!isPublicPath) return <Navigate to="/auth" replace />;
    return null;
  }

  if (isAdmin) {
    if (authOnlyPaths.includes(location.pathname)) return <Navigate to="/admin" replace />;
    return null;
  }

  if (!profile) return null;

  const mustSetPasswordFirst = userHasOAuthLogin(user) && !userHasPasswordLogin(user);
  if (mustSetPasswordFirst) {
    if (location.pathname !== "/set-password" && !isPublicPath) {
      return <Navigate to="/set-password" replace />;
    }
    return null;
  }

  if (!profile.profile_completed) {
    if (location.pathname !== "/onboarding" && !isPublicPath) {
      return <Navigate to="/onboarding" replace />;
    }
    return null;
  }

  if (profile.approval_status !== "approved") {
    if (location.pathname !== "/pending" && !isPublicPath) {
      return <Navigate to="/pending" replace />;
    }
    return null;
  }

  if (authOnlyPaths.includes(location.pathname)) return <Navigate to="/" replace />;
  return null;
};

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
            <AppAccessGuard />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/set-password" element={<ForceSetPassword />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/pending" element={<PendingApproval />} />
              <Route path="/packages" element={<Packages />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/profile" element={<Profile />} />
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
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
