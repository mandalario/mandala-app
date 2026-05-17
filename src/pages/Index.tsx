import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { OceanBackground } from "@/components/OceanBackground";
import StudentHome from "./StudentHome";

import { Loader2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user, profile, isAdmin, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    if (isAdmin) {
      navigate("/admin", { replace: true });
      return;
    }
    if (!isAdmin && profile && !profile.profile_completed) {
      navigate("/onboarding", { replace: true });
      return;
    }
    if (!isAdmin && profile && profile.approval_status !== "approved") {
      navigate("/pending", { replace: true });
    }
  }, [user, profile, isAdmin, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <OceanBackground />
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <OceanBackground />
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <OceanBackground />
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Approved student
  if (profile.profile_completed && profile.approval_status === "approved") {
    return <StudentHome />;
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      <OceanBackground />
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
};

export default Index;
