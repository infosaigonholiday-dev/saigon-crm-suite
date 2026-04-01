import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { PermissionGuard } from "@/components/PermissionGuard";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Leads from "./pages/Leads";
import Bookings from "./pages/Bookings";
import BookingDetail from "./pages/BookingDetail";
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
import Vendors from "./pages/Vendors";
import Settings from "./pages/Settings";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { session } = useAuth();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/khach-hang" element={<PermissionGuard permission="customers.view"><Customers /></PermissionGuard>} />
        <Route path="/khach-hang/:id" element={<PermissionGuard permission="customers.view"><CustomerDetail /></PermissionGuard>} />
        <Route path="/tiem-nang" element={<PermissionGuard permission="leads.view"><Leads /></PermissionGuard>} />
        <Route path="/bao-gia" element={<PermissionGuard permission="quotations.view"><Quotations /></PermissionGuard>} />
        <Route path="/goi-tour" element={<PermissionGuard permission="quotations.view"><TourPackages /></PermissionGuard>} />
        <Route path="/lich-trinh" element={<PermissionGuard permission="quotations.view"><Itineraries /></PermissionGuard>} />
        <Route path="/luu-tru" element={<PermissionGuard permission="quotations.view"><Accommodations /></PermissionGuard>} />
        <Route path="/dat-tour" element={<PermissionGuard permission="bookings.view"><Bookings /></PermissionGuard>} />
        <Route path="/dat-tour/:id" element={<PermissionGuard permission="bookings.view"><BookingDetail /></PermissionGuard>} />
        <Route path="/nha-cung-cap" element={<Vendors />} />
        <Route path="/hop-dong" element={<ComingSoon title="Hợp đồng" />} />
        <Route path="/thanh-toan" element={<PermissionGuard permission="payments.view"><Payments /></PermissionGuard>} />
        <Route path="/nhan-su" element={<PermissionGuard permission="employees.view"><Employees /></PermissionGuard>} />
        <Route path="/nhan-su/:id" element={<PermissionGuard permission="employees.view"><EmployeeDetail /></PermissionGuard>} />
        <Route path="/nghi-phep" element={<PermissionGuard permission="leave.view"><LeaveManagement /></PermissionGuard>} />
        <Route path="/bang-luong" element={<PermissionGuard permission="payroll.view"><Payroll /></PermissionGuard>} />
        <Route path="/tai-chinh" element={<PermissionGuard anyOf={["finance.view", "finance.submit"]}><Finance /></PermissionGuard>} />
        <Route path="/cai-dat" element={<PermissionGuard permission="settings.view"><Settings /></PermissionGuard>} />
      </Route>
      <Route path="*" element={<NotFound />} />
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
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
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
