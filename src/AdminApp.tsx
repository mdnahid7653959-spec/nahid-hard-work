import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Admin Pages - lazy load
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const ProductForm = lazy(() => import("./pages/admin/ProductForm"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminBrands = lazy(() => import("./pages/admin/AdminBrands"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminCJSettings = lazy(() => import("./pages/admin/AdminCJSettings"));
const AdminSellers = lazy(() => import("./pages/admin/AdminSellers"));
const AdminShipping = lazy(() => import("./pages/admin/AdminShipping"));
const AdminCommissions = lazy(() => import("./pages/admin/AdminCommissions"));
const AdminInventory = lazy(() => import("./pages/admin/AdminInventory"));
const AdminMarketing = lazy(() => import("./pages/admin/AdminMarketing"));
const AdminLoyalty = lazy(() => import("./pages/admin/AdminLoyalty"));
const AdminFreeDelivery = lazy(() => import("./pages/admin/AdminFreeDelivery"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminSecurity = lazy(() => import("./pages/admin/AdminSecurity"));
const AdminCMS = lazy(() => import("./pages/admin/AdminCMS"));
const AdminConsignments = lazy(() => import("./pages/admin/AdminConsignments"));
const AdminPushNotifications = lazy(() => import("./pages/admin/AdminPushNotifications"));
const AdminThemeBuilder = lazy(() => import("./pages/admin/AdminThemeBuilder"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const AdminApp = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AdminAuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Root redirects to admin login */}
                <Route path="/" element={<Navigate to="/admin/login" replace />} />
                
                {/* Admin Login (public) */}
                <Route path="/admin/login" element={<AdminLogin />} />
                
                {/* Protected Admin Routes */}
                <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
                <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
                <Route path="/admin/products" element={<AdminProtectedRoute><AdminProducts /></AdminProtectedRoute>} />
                <Route path="/admin/products/new" element={<AdminProtectedRoute><ProductForm /></AdminProtectedRoute>} />
                <Route path="/admin/products/:id" element={<AdminProtectedRoute><ProductForm /></AdminProtectedRoute>} />
                <Route path="/admin/categories" element={<AdminProtectedRoute><AdminCategories /></AdminProtectedRoute>} />
                <Route path="/admin/brands" element={<AdminProtectedRoute><AdminBrands /></AdminProtectedRoute>} />
                <Route path="/admin/orders" element={<AdminProtectedRoute><AdminOrders /></AdminProtectedRoute>} />
                <Route path="/admin/users" element={<AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>} />
                <Route path="/admin/coupons" element={<AdminProtectedRoute><AdminCoupons /></AdminProtectedRoute>} />
                <Route path="/admin/reviews" element={<AdminProtectedRoute><AdminReviews /></AdminProtectedRoute>} />
                <Route path="/admin/cj-settings" element={<AdminProtectedRoute><AdminCJSettings /></AdminProtectedRoute>} />
                <Route path="/admin/sellers" element={<AdminProtectedRoute><AdminSellers /></AdminProtectedRoute>} />
                <Route path="/admin/shipping" element={<AdminProtectedRoute><AdminShipping /></AdminProtectedRoute>} />
                <Route path="/admin/commissions" element={<AdminProtectedRoute><AdminCommissions /></AdminProtectedRoute>} />
                <Route path="/admin/inventory" element={<AdminProtectedRoute><AdminInventory /></AdminProtectedRoute>} />
                <Route path="/admin/marketing" element={<AdminProtectedRoute><AdminMarketing /></AdminProtectedRoute>} />
                <Route path="/admin/loyalty" element={<AdminProtectedRoute><AdminLoyalty /></AdminProtectedRoute>} />
                <Route path="/admin/free-delivery" element={<AdminProtectedRoute><AdminFreeDelivery /></AdminProtectedRoute>} />
                <Route path="/admin/reports" element={<AdminProtectedRoute><AdminReports /></AdminProtectedRoute>} />
                <Route path="/admin/security" element={<AdminProtectedRoute><AdminSecurity /></AdminProtectedRoute>} />
                <Route path="/admin/cms" element={<AdminProtectedRoute><AdminCMS /></AdminProtectedRoute>} />
                <Route path="/admin/consignments" element={<AdminProtectedRoute><AdminConsignments /></AdminProtectedRoute>} />
                <Route path="/admin/push-notifications" element={<AdminProtectedRoute><AdminPushNotifications /></AdminProtectedRoute>} />
                <Route path="/admin/theme-builder" element={<AdminProtectedRoute><AdminThemeBuilder /></AdminProtectedRoute>} />
                <Route path="/admin/settings" element={<AdminProtectedRoute><AdminSettings /></AdminProtectedRoute>} />
                
                {/* Catch-all redirects to admin */}
                <Route path="*" element={<Navigate to="/admin/login" replace />} />
              </Routes>
            </Suspense>
          </AdminAuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default AdminApp;
