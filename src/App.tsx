import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./lib/firebase";
import { AlertTriangle, Loader2 } from "lucide-react";

// Layouts
import { MainLayout } from "./components/layout/MainLayout";
import { AdminLayout } from "./components/layout/AdminLayout";
import { MobileNav } from "./components/layout/MobileNav";

// Pages
import { Home } from "./pages/Home";
import { Auth } from "./pages/Auth";
import { ServiceDetails } from "./pages/ServiceDetails";
import { UserDashboard } from "./pages/UserDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminServices } from "./pages/AdminServices";
import { AdminServiceAdd } from "./pages/AdminServiceAdd";
import { AdminServiceEdit } from "./pages/AdminServiceEdit";
import { AdminUsers } from "./pages/AdminUsers";
import { AdminTransactions } from "./pages/AdminTransactions";
import { AdminVerifications } from "./pages/AdminVerifications";
import { AdminSettings } from "./pages/AdminSettings";
import { Terms } from "./pages/Terms";
import { Privacy } from "./pages/Privacy";

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", "global"), (snapshot) => {
      if (snapshot.exists()) {
        setMaintenanceMode(snapshot.data().maintenanceMode || false);
      }
      setSettingsLoading(false);
    }, () => {
      setSettingsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const isAdmin = user?.email === 'yuseef.syrai098@gmail.com' || user?.email === 'ywsfkrt300@gmail.com';

  if (authLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (maintenanceMode && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-6 text-center">
        <div className="w-24 h-24 bg-amber-100 dark:bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center mb-8">
          <AlertTriangle size={48} />
        </div>
        <h1 className="text-4xl font-bold text-slate-800 dark:text-white mb-4 leading-tight">الموقع في وضع الصيانة</h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          نحن نقوم ببعض التحديثات الضرورية لتحسين تجربتكم. <br /> سنعود قريباً جداً، نشكركم على صبركم.
        </p>
        <div className="mt-12 text-sm text-slate-400 font-en">
          &copy; {new Date().getFullYear()} Pay Minutes
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="pb-16 lg:pb-0">
        <Routes>
        {/* Main User Routes */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/service/:id" element={<ServiceDetails />} />
          <Route path="/user" element={user ? <UserDashboard /> : <Navigate to="/auth" />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
        </Route>

        {/* Auth Route (No Header/Footer) */}
        <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />

        {/* Admin Routes */}
        <Route path="/admin" element={isAdmin ? <AdminLayout /> : <Navigate to="/" />}>
          <Route index element={<AdminDashboard />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="services/new" element={<AdminServiceAdd />} />
          <Route path="services/edit/:id" element={<AdminServiceEdit />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="verifications" element={<AdminVerifications />} />
          <Route path="transactions" element={<AdminTransactions />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      </div>
      <MobileNav />
    </Router>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="app-ui-theme">
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
