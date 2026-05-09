import { Moon, Sun, User, LogOut, FileText, Bell, Menu, Globe } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t, dir } = useLanguage();
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [appName, setAppName] = useState("باي مينتس");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "in", ["all", user.uid]),
      where("read", "==", false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasUnreadNotifs(!snapshot.empty);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const sDoc = await getDoc(doc(db, "settings", "global"));
        if (sDoc.exists()) {
          const data = sDoc.data();
          setAppName(data.appName || "باي مينتس");
          setLogoUrl(data.logoUrl || null);
        }
      } catch (error) {
        console.error(error);
      }
    }
    fetchSettings();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const transparentNavbarOnHome = location.pathname === "/" && !isScrolled;

  const navLinks = [
    { name: t("nav.home"), path: "/" },
    { name: t("nav.services"), path: "/#services" },
    { name: t("nav.offers"), path: "/#offers" },
    { name: t("nav.help"), path: "/#help" },
  ];

  const isAdmin = user?.email?.toLowerCase() === 'yuseef.syrai098@gmail.com' || user?.email?.toLowerCase() === 'ywsfkrt300@gmail.com';

  return (
    <nav
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b",
        transparentNavbarOnHome
          ? "bg-transparent border-transparent text-white dark:text-white"
          : "bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-50"
      )}
      dir={dir}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/20">
                {appName.charAt(0)}
              </div>
            )}
            <span className="font-bold text-xl tracking-tight">{appName}</span>
          </Link>

          {/* Desktop Links */}
          <div className={`hidden md:flex items-center gap-8 ${dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'}`}>
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={cn(
                  "font-medium hover:text-indigo-500 transition-colors text-sm",
                  location.pathname === link.path ? "text-indigo-500" : ""
                )}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className={`flex items-center gap-2 sm:gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Language Toggle */}
            <button
               onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
               className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-bold flex items-center gap-1"
               title={language === "ar" ? "English" : "العربية"}
            >
               <Globe size={18} className="text-slate-400" />
               <span className="hidden sm:inline">{language === "ar" ? "EN" : "AR"}</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === "dark" ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-slate-400" />}
            </button>

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-xl transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <User size={18} />
                  </div>
                  <span className="font-medium hidden sm:block truncate max-w-[80px]">
                    {t("nav.myAccount")}
                  </span>
                </button>

                <AnimatePresence>
                  {userDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={cn(
                        "absolute mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden py-2",
                        dir === "rtl" ? "left-0" : "right-0"
                      )}
                    >
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                        <p className="font-medium truncate">{user.displayName || 'مستخدم'}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                      <Link to="/user" className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => setUserDropdownOpen(false)}>
                        <User size={16} className="text-slate-400" />
                        <span>{t("nav.profile")}</span>
                      </Link>
                      <Link to="/user?tab=orders" className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => setUserDropdownOpen(false)}>
                        <FileText size={16} className="text-slate-400" />
                        <span>{t("nav.orders")}</span>
                      </Link>
                      <Link to="/user?tab=support" className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => setUserDropdownOpen(false)}>
                        <div className="relative">
                          <Bell size={16} className="text-slate-400" />
                          {hasUnreadNotifs && <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></div>}
                        </div>
                        <span>{t("nav.support")}</span>
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" className="flex items-center gap-3 px-4 py-2.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border-t border-slate-100 dark:border-slate-700" onClick={() => setUserDropdownOpen(false)}>
                          <User size={16} />
                          <span>{t("nav.admin")}</span>
                        </Link>
                      )}
                      <button onClick={() => { logout(); setUserDropdownOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                        <LogOut size={16} />
                        <span>{t("nav.logout")}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                to="/auth"
                className="px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
              >
                {t("nav.login")}
              </Link>
            )}

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2">
              <Menu size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={cn(
                    "block px-4 py-3 rounded-xl font-medium transition-colors",
                    location.pathname === link.path
                      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              {!user && (
                <Link
                  to="/auth"
                  className="block w-full text-center mt-4 px-5 py-3 rounded-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("nav.login")}
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
