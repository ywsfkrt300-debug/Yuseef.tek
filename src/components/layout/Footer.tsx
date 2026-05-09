import { Link } from "react-router-dom";
import { Facebook, Instagram, Twitter, MessageSquare, Share2, Youtube, Globe, Shield, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

export function Footer() {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const sDoc = await getDoc(doc(db, "settings", "global"));
        if (sDoc.exists()) {
          setSettings(sDoc.data());
        }
      } catch (error) {
        console.error(error);
      }
    }
    fetchSettings();
  }, []);

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "facebook": return <Facebook size={20} />;
      case "twitter": return <Twitter size={20} />;
      case "instagram": return <Instagram size={20} />;
      case "youtube": return <Youtube size={20} />;
      case "whatsapp": return <MessageSquare size={20} />;
      case "telegram": return <Share2 size={20} />;
      default: return <Globe size={20} />;
    }
  };

  return (
    <footer className="bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pt-16 pb-8 text-right">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12 flex-row-reverse">
          {/* Column 1 */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-6 flex-row-reverse">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold shadow-md">
                {settings?.appName ? settings.appName.charAt(0) : 'P'}
              </div>
              <span className="font-bold text-xl tracking-tight">{settings?.appName || "باي مينتس"}</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed max-w-md ml-auto">
              منصتك الأولى لإنجاز كافة خدماتك المالية، الفواتير، وشحن الرصيد خلال ثوانٍ وبأعلى درجات الأمان في سوريا.
            </p>
            
            {/* Social Links */}
            <div className="flex items-center gap-4 flex-row-reverse">
              {settings?.socialLinks && settings.socialLinks.map((link: any, i: number) => (
                <a 
                  key={i} 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:border-indigo-500 transition-all shadow-sm"
                  title={link.platform}
                >
                  {getPlatformIcon(link.platform)}
                </a>
              ))}
            </div>
          </div>

          {/* Column 2 */}
          <div className="mr-auto">
            <h3 className="font-bold mb-6 text-slate-800 dark:text-slate-200">روابط سريعة</h3>
            <ul className="space-y-4">
              <li><Link to="/" className="text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors flex items-center gap-2 justify-end">الرئيسية</Link></li>
              <li><Link to="/#services" className="text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors flex items-center gap-2 justify-end">خدماتنا</Link></li>
              <li><Link to="/auth" className="text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors flex items-center gap-2 justify-end">إنشاء حساب</Link></li>
            </ul>
          </div>

          {/* Column 3 */}
          <div>
            <h3 className="font-bold mb-6 text-slate-800 dark:text-slate-200">الدعم والخصوصية</h3>
            <ul className="space-y-4">
              <li><Link to="/terms" className="text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors flex items-center gap-2 justify-end">
                الشروط والأحكام
                <FileText size={14} className="text-slate-400" />
              </Link></li>
              <li><Link to="/privacy" className="text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors flex items-center gap-2 justify-end">
                سياسة الخصوصية
                <Shield size={14} className="text-slate-400" />
              </Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-500 font-medium">
          <p>© {new Date().getFullYear()} {settings?.appName || "باي مينتس"}. جميع الحقوق محفوظة.</p>
          <div className="flex gap-6">
            <Link to="/terms" className="hover:text-indigo-500 transition-colors">اتفاقية الاستخدام</Link>
            <Link to="/privacy" className="hover:text-indigo-500 transition-colors">الخصوصية والأمان</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
