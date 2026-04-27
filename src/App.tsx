import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import { AppLayout } from "@/components/AppLayout";
import { PermissionGuard } from "@/components/PermissionGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

// Lazy load tất cả pages còn lại để giảm bundle size
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Customers = lazy(() => import("./pages/Customers"));
const CustomerDetail = lazy(() => import("./pages/CustomerDetail"));
const Leads = lazy(() => import("./pages/Leads"));
const Bookings = lazy(() => import("./pages/Bookings"));
const BookingDetail = lazy(() => import("./pages/BookingDetail"));
const Payments = lazy(() => import("./pages/Payments"));
const Employees = lazy(() => import("./pages/Employees"));
const EmployeeDetail = lazy(() => import("./pages/EmployeeDetail"));
const LeaveManagement = lazy(() => import("./pages/LeaveManagement"));
const Payroll = lazy(() => import("./pages/Payroll"));
const Finance = lazy(() => import("./pages/Finance"));
const Contracts = lazy(() => import("./pages/Contracts"));
const Quotations = lazy(() => import("./pages/Quotations"));
const TourPackages = lazy(() => import("./pages/TourPackages"));
const Itineraries = lazy(() => import("./pages/Itineraries"));
const Accommodations = lazy(() => import("./pages/Accommodations"));
const Vendors = lazy(() => import("./pages/Vendors"));
const Settings = lazy(() => import("./pages/Settings"));
const SOPLibrary = lazy(() => import("./pages/SOPLibrary"));
const UserGuide = lazy(() => import("./pages/UserGuide"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const FirstLoginChangePassword = lazy(() => import("./pages/FirstLoginChangePassword"));
const RawContacts = lazy(() => import("./pages/RawContacts"));
const B2BTours = lazy(() => import("./pages/B2BTours"));
const AlertsCenter = lazy(() => import("./pages/AlertsCenter"));
const BookingConfirmationPrint = lazy(() => import("./pages/BookingConfirmationPrint"));
const Recruitment = lazy(() => import("./pages/Recruitment"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

function ProtectedRoutes() {
  const { session, mustChangePassword } = useAuth();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Force password change on first login
  if (mustChangePassword) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/first-login-change-password" element={<FirstLoginChangePassword />} />
          <Route path="*" element={<Navigate to="/first-login-change-password" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
          <Route path="/khach-hang" element={<ErrorBoundary><PermissionGuard module="customers" action="view"><Customers /></PermissionGuard></ErrorBoundary>} />
          <Route path="/khach-hang/:id" element={<ErrorBoundary><PermissionGuard module="customers" action="view"><CustomerDetail /></PermissionGuard></ErrorBoundary>} />
          <Route path="/tiem-nang" element={<ErrorBoundary><PermissionGuard module="leads" action="view"><Leads /></PermissionGuard></ErrorBoundary>} />
          <Route path="/kho-data" element={<ErrorBoundary><PermissionGuard module="raw_contacts" action="view"><RawContacts /></PermissionGuard></ErrorBoundary>} />
          <Route path="/b2b-tours" element={<ErrorBoundary><PermissionGuard module="b2b_tours" action="view"><B2BTours /></PermissionGuard></ErrorBoundary>} />
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
          <Route path="/tuyen-dung" element={<ErrorBoundary><PermissionGuard module="candidates" action="view"><Recruitment /></PermissionGuard></ErrorBoundary>} />
          <Route path="/tai-chinh" element={<ErrorBoundary><PermissionGuard anyOf={[["finance", "view"], ["finance", "submit"]]}><Finance /></PermissionGuard></ErrorBoundary>} />
          <Route path="/cai-dat" element={<ErrorBoundary><PermissionGuard module="settings" action="view"><Settings /></PermissionGuard></ErrorBoundary>} />
          <Route path="/quy-trinh" element={<ErrorBoundary><PermissionGuard module="workflow" action="view"><SOPLibrary /></PermissionGuard></ErrorBoundary>} />
          <Route path="/canh-bao" element={<ErrorBoundary><AlertsCenter /></ErrorBoundary>} />
          <Route path="/huong-dan" element={<ErrorBoundary><UserGuide /></ErrorBoundary>} />
        </Route>
        <Route path="/dat-tour/:id/in-xac-nhan" element={
          <ErrorBoundary><BookingConfirmationPrint /></ErrorBoundary>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
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
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </Suspense>
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
