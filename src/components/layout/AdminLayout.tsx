import { Outlet, Link, useLocation } from "react-router-dom";
import { Home, Users, Settings, PlusCircle, CreditCard, LayoutTemplate, Briefcase, FileText, Menu, X, Bell, Moon, Sun, Lock, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const isAuth = sessionStorage.getItem("adminAuth");
    if (isAuth === "true") {
      setIsAdminAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    // Use an environment variable for the admin password, or default to "123456" for demo.
    const adminPassword = (import.meta as any).env.VITE_ADMIN_PASSWORD || "123456";
    if (passwordInput === adminPassword) {
      if (user) {
        setLoading(true);
        try {
          await updateDoc(doc(db, "users", user.uid), {
            role: "admin",
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, "users");
        } finally {
          setLoading(false);
        }
      }
      sessionStorage.setItem("adminAuth", "true");
      setIsAdminAuthenticated(true);
    } else {
      setError("كلمة المرور غير صحيحة");
    }
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">لوحة المشرف</h1>
          <p className="text-slate-500 mb-8">الرجاء إدخال كلمة سر المشرف للوصول للوحة التحكم</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="كلمة المرور"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-center dir-ltr tracking-widest text-lg"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3.5 rounded-xl transition-colors">
              دخول
            </button>
            <Link to="/" className="block text-sm text-slate-500 hover:text-indigo-500 mt-4">
              العودة للموقع
            </Link>
          </form>
        </div>
      </div>
    );
  }

  const links = [
    { name: "الرئيسية", path: "/admin", icon: <Home size={20} /> },
    { name: "الخدمات", path: "/admin/services", icon: <PlusCircle size={20} /> },
    { name: "المستخدمون", path: "/admin/users", icon: <Users size={20} /> },
    { name: "طلبات التوثيق", path: "/admin/verifications", icon: <Shield size={20} /> },
    { name: "العمليات المالية", path: "/admin/transactions", icon: <CreditCard size={20} /> },
    { name: "إعدادات", path: "/admin/settings", icon: <Settings size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden backdrop-blur-sm" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 right-0 z-50 w-72 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 transform transition-transform duration-300 lg:relative lg:translate-x-0 flex flex-col ${sidebarOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <Link to="/admin" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold font-en">A</div>
            <span className="font-bold text-xl text-slate-800 dark:text-white truncate">لوحة المشرف</span>
          </Link>
          <button className="lg:hidden text-slate-500" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
          {links.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                location.pathname === link.path
                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {link.icon}
              {link.name}
            </Link>
          ))}
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0">
          <button className="lg:hidden text-slate-500" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          
          <div className="hidden lg:block text-xl font-bold text-slate-800 dark:text-white">
            مرحباً، مشرف النظام
          </div>

          <div className="flex items-center gap-4">
            <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 relative">
              <Bell size={20} />
              <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500 outline outline-2 outline-white dark:outline-slate-800"></span>
            </button>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
               {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <Users size={20} className="text-indigo-600" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
