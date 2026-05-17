import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { useLocation } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { PushNotificationManager } from "@/components/PushNotificationManager";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import PendingApproval from "./pages/PendingApproval.tsx";
import Packages from "./pages/Packages.tsx";
import Schedule from "./pages/Schedule.tsx";
import Feed from "./pages/Feed.tsx";
import Chat from "./pages/Chat.tsx";
import AdminLayout from "./pages/admin/AdminLayout.tsx";
import AdminDashboardHome from "./pages/admin/AdminDashboardHome.tsx";
import AdminStudents from "./pages/admin/AdminStudents.tsx";
import AdminSchedule from "./pages/admin/AdminSchedule.tsx";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <PushNotificationManager />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/pending" element={<PendingApproval />} />
              <Route path="/packages" element={<Packages />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/terms" element={<LegalPage kind="terms" />} />
              <Route path="/privacy" element={<LegalPage kind="privacy" />} />

              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboardHome />} />
                <Route path="students" element={<AdminStudents />} />
                <Route path="schedule" element={<AdminSchedule />} />
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
