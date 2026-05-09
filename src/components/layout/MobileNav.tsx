import { Home, User, Clock, LayoutGrid } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "motion/react";

export function MobileNav() {
  const location = useLocation();
  
  const navItems = [
    { name: "الرئيسية", path: "/", icon: <Home size={24} /> },
    { name: "طلباتي", path: "/user?tab=transactions", icon: <Clock size={24} /> },
    { name: "حسابي", path: "/user", icon: <User size={24} /> },
  ];

  // Don't show on admin paths or auth
  if (location.pathname.startsWith("/admin") || location.pathname === "/auth") {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-6 py-3">
        <div className="flex justify-between items-center max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
                           (item.path !== "/" && location.pathname.startsWith(item.path.split('?')[0]));
            
            return (
              <Link 
                key={item.name} 
                to={item.path}
                className="flex flex-col items-center gap-1 group relative"
              >
                <div className={`transition-all duration-300 ${isActive ? "text-indigo-500 scale-110" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200"}`}>
                  {item.icon}
                </div>
                <span className={`text-[10px] font-bold transition-colors ${isActive ? "text-indigo-500" : "text-slate-400"}`}>
                  {item.name}
                </span>
                {isActive && (
                  <motion.div 
                    layoutId="activeTab" 
                    className="absolute -top-3 w-8 h-1 bg-indigo-500 rounded-full"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
      {/* Safe area offset for some mobile browsers */}
      <div className="h-[env(safe-area-inset-bottom)] bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg"></div>
    </div>
  );
}
