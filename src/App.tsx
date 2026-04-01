import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { PermissionGuard } from "@/components/PermissionGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
import Contracts from "./pages/Contracts";
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
        <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
        <Route path="/khach-hang" element={<ErrorBoundary><PermissionGuard permission="customers.view"><Customers /></PermissionGuard></ErrorBoundary>} />
        <Route path="/khach-hang/:id" element={<ErrorBoundary><PermissionGuard permission="customers.view"><CustomerDetail /></PermissionGuard></ErrorBoundary>} />
        <Route path="/tiem-nang" element={<ErrorBoundary><PermissionGuard permission="leads.view"><Leads /></PermissionGuard></ErrorBoundary>} />
        <Route path="/bao-gia" element={<ErrorBoundary><PermissionGuard permission="quotations.view"><Quotations /></PermissionGuard></ErrorBoundary>} />
        <Route path="/goi-tour" element={<ErrorBoundary><PermissionGuard permission="quotations.view"><TourPackages /></PermissionGuard></ErrorBoundary>} />
        <Route path="/lich-trinh" element={<ErrorBoundary><PermissionGuard permission="quotations.view"><Itineraries /></PermissionGuard></ErrorBoundary>} />
        <Route path="/luu-tru" element={<ErrorBoundary><PermissionGuard permission="quotations.view"><Accommodations /></PermissionGuard></ErrorBoundary>} />
        <Route path="/dat-tour" element={<ErrorBoundary><PermissionGuard permission="bookings.view"><Bookings /></PermissionGuard></ErrorBoundary>} />
        <Route path="/dat-tour/:id" element={<ErrorBoundary><PermissionGuard permission="bookings.view"><BookingDetail /></PermissionGuard></ErrorBoundary>} />
        <Route path="/nha-cung-cap" element={<ErrorBoundary><Vendors /></ErrorBoundary>} />
        <Route path="/hop-dong" element={<ErrorBoundary><PermissionGuard permission="bookings.view"><Contracts /></PermissionGuard></ErrorBoundary>} />
        <Route path="/thanh-toan" element={<ErrorBoundary><PermissionGuard permission="payments.view"><Payments /></PermissionGuard></ErrorBoundary>} />
        <Route path="/nhan-su" element={<ErrorBoundary><PermissionGuard permission="employees.view"><Employees /></PermissionGuard></ErrorBoundary>} />
        <Route path="/nhan-su/:id" element={<ErrorBoundary><PermissionGuard permission="employees.view"><EmployeeDetail /></PermissionGuard></ErrorBoundary>} />
        <Route path="/nghi-phep" element={<ErrorBoundary><PermissionGuard permission="leave.view"><LeaveManagement /></PermissionGuard></ErrorBoundary>} />
        <Route path="/bang-luong" element={<ErrorBoundary><PermissionGuard permission="payroll.view"><Payroll /></PermissionGuard></ErrorBoundary>} />
        <Route path="/tai-chinh" element={<ErrorBoundary><PermissionGuard anyOf={["finance.view", "finance.submit"]}><Finance /></PermissionGuard></ErrorBoundary>} />
        <Route path="/cai-dat" element={<ErrorBoundary><PermissionGuard permission="settings.view"><Settings /></PermissionGuard></ErrorBoundary>} />
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
