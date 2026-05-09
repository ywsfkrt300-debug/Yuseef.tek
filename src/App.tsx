import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";

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
import { AdminUsers } from "./pages/AdminUsers";
import { AdminTransactions } from "./pages/AdminTransactions";

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="app-ui-theme">
      <AuthProvider>
        <Router>
          <div className="pb-16 lg:pb-0">
            <Routes>
            {/* Main User Routes */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/service/:id" element={<ServiceDetails />} />
              <Route path="/user" element={<UserDashboard />} />
            </Route>

            {/* Auth Route (No Header/Footer) */}
            <Route path="/auth" element={<Auth />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="services" element={<AdminServices />} />
              <Route path="services/new" element={<AdminServiceAdd />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="transactions" element={<AdminTransactions />} />
            </Route>
          </Routes>
          </div>
          <MobileNav />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
