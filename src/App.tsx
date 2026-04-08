import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
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
import SOPLibrary from "./pages/SOPLibrary";
import UserGuide from "./pages/UserGuide";
import ResetPassword from "./pages/ResetPassword";
import FirstLoginChangePassword from "./pages/FirstLoginChangePassword";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { session, mustChangePassword } = useAuth();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Force password change on first login
  if (mustChangePassword) {
    return (
      <Routes>
        <Route path="/first-login-change-password" element={<FirstLoginChangePassword />} />
        <Route path="*" element={<Navigate to="/first-login-change-password" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
        <Route path="/khach-hang" element={<ErrorBoundary><PermissionGuard module="customers" action="view"><Customers /></PermissionGuard></ErrorBoundary>} />
        <Route path="/khach-hang/:id" element={<ErrorBoundary><PermissionGuard module="customers" action="view"><CustomerDetail /></PermissionGuard></ErrorBoundary>} />
        <Route path="/tiem-nang" element={<ErrorBoundary><PermissionGuard module="leads" action="view"><Leads /></PermissionGuard></ErrorBoundary>} />
        <Route path="/bao-gia" element={<ErrorBoundary><PermissionGuard module="quotations" action="view"><Quotations /></PermissionGuard></ErrorBoundary>} />
        <Route path="/goi-tour" element={<ErrorBoundary><PermissionGuard module="tour_packages" action="view"><TourPackages /></PermissionGuard></ErrorBoundary>} />
        <Route path="/lich-trinh" element={<ErrorBoundary><PermissionGuard module="itineraries" action="view"><Itineraries /></PermissionGuard></ErrorBoundary>} />
        <Route path="/luu-tru" element={<ErrorBoundary><PermissionGuard module="accommodations" action="view"><Accommodations /></PermissionGuard></ErrorBoundary>} />
        <Route path="/dat-tour" element={<ErrorBoundary><PermissionGuard module="bookings" action="view"><Bookings /></PermissionGuard></ErrorBoundary>} />
        <Route path="/dat-tour/:id" element={<ErrorBoundary><PermissionGuard module="bookings" action="view"><BookingDetail /></PermissionGuard></ErrorBoundary>} />
        <Route path="/nha-cung-cap" element={<ErrorBoundary><PermissionGuard module="suppliers" action="view"><Vendors /></PermissionGuard></ErrorBoundary>} />
        <Route path="/hop-dong" element={<ErrorBoundary><PermissionGuard module="contracts" action="view"><Contracts /></PermissionGuard></ErrorBoundary>} />
        <Route path="/thanh-toan" element={<ErrorBoundary><PermissionGuard module="payments" action="view"><Payments /></PermissionGuard></ErrorBoundary>} />
        <Route path="/nhan-su" element={<ErrorBoundary><PermissionGuard module="staff" action="view"><Employees /></PermissionGuard></ErrorBoundary>} />
        <Route path="/nhan-su/:id" element={<ErrorBoundary><PermissionGuard module="staff" action="view"><EmployeeDetail /></PermissionGuard></ErrorBoundary>} />
        <Route path="/nghi-phep" element={<ErrorBoundary><PermissionGuard module="leave" action="view"><LeaveManagement /></PermissionGuard></ErrorBoundary>} />
        <Route path="/bang-luong" element={<ErrorBoundary><PermissionGuard module="payroll" action="view"><Payroll /></PermissionGuard></ErrorBoundary>} />
        <Route path="/tai-chinh" element={<ErrorBoundary><PermissionGuard anyOf={[["finance", "view"], ["finance", "submit"]]}><Finance /></PermissionGuard></ErrorBoundary>} />
        <Route path="/cai-dat" element={<ErrorBoundary><PermissionGuard module="settings" action="view"><Settings /></PermissionGuard></ErrorBoundary>} />
        <Route path="/quy-trinh" element={<ErrorBoundary><PermissionGuard module="workflow" action="view"><SOPLibrary /></PermissionGuard></ErrorBoundary>} />
        <Route path="/huong-dan" element={<ErrorBoundary><UserGuide /></ErrorBoundary>} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function AppRoutes() {
  const { session, loading, isReady } = useAuth();

  if (loading || !isReady) {
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
          <PermissionsProvider>
            <AppRoutes />
          </PermissionsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
