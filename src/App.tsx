import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Leads from "./pages/Leads";
import Bookings from "./pages/Bookings";
import Payments from "./pages/Payments";
import Employees from "./pages/Employees";
import EmployeeDetail from "./pages/EmployeeDetail";
import LeaveManagement from "./pages/LeaveManagement";
import Payroll from "./pages/Payroll";
import Finance from "./pages/Finance";
import Login from "./pages/Login";
import ComingSoon from "./pages/ComingSoon";
import Quotations from "./pages/Quotations";
import TourPackages from "./pages/TourPackages";
import Itineraries from "./pages/Itineraries";
import Accommodations from "./pages/Accommodations";
import Settings from "./pages/Settings";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/khach-hang" element={<Customers />} />
        <Route path="/tiem-nang" element={<Leads />} />
        <Route path="/bao-gia" element={<Quotations />} />
        <Route path="/goi-tour" element={<TourPackages />} />
        <Route path="/lich-trinh" element={<Itineraries />} />
        <Route path="/luu-tru" element={<Accommodations />} />
        <Route path="/dat-tour" element={<Bookings />} />
        <Route path="/hop-dong" element={<ComingSoon title="Hợp đồng" />} />
        <Route path="/thanh-toan" element={<Payments />} />
        <Route path="/nhan-su" element={<Employees />} />
        <Route path="/nhan-su/:id" element={<EmployeeDetail />} />
        <Route path="/nghi-phep" element={<LeaveManagement />} />
        <Route path="/bang-luong" element={<Payroll />} />
        <Route path="/tai-chinh" element={<Finance />} />
        <Route path="/cai-dat" element={<Settings />} />
      </Route>
    </Routes>
  );
}

function AppRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/*" element={<ProtectedRoutes />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
