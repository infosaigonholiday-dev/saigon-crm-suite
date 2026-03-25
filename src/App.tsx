import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Leads from "./pages/Leads";
import Bookings from "./pages/Bookings";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/khach-hang" element={<Customers />} />
            <Route path="/tiem-nang" element={<Leads />} />
            <Route path="/bao-gia" element={<ComingSoon title="Báo giá" />} />
            <Route path="/dat-tour" element={<Bookings />} />
            <Route path="/hop-dong" element={<ComingSoon title="Hợp đồng" />} />
            <Route path="/thanh-toan" element={<ComingSoon title="Thanh toán" />} />
            <Route path="/nhan-su" element={<ComingSoon title="Nhân sự" />} />
            <Route path="/tai-chinh" element={<ComingSoon title="Tài chính" />} />
            <Route path="/cai-dat" element={<ComingSoon title="Cài đặt" />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
