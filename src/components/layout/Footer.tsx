import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Column 1 */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                P
              </div>
              <span className="font-bold text-lg tracking-tight">باي مينتس</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              منصتك الأولى لإنجاز كافة خدماتك المالية، الفواتير، وشحن الرصيد خلال ثوانٍ وبأعلى درجات الأمان.
            </p>
          </div>

          {/* Column 2 */}
          <div>
            <h3 className="font-bold mb-6 text-slate-800 dark:text-slate-200">روابط سريعة</h3>
            <ul className="space-y-4">
              <li><Link to="/" className="text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors">الرئيسية</Link></li>
              <li><Link to="/#services" className="text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors">خدماتنا</Link></li>
              <li><Link to="/auth" className="text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors">إنشاء حساب</Link></li>
              <li><Link to="#" className="text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors">مركز المساعدة</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} باي مينتس. جميع الحقوق محفوظة.</p>
          <div className="flex gap-4">
            <Link to="#" className="hover:text-indigo-500">الشروط والأحكام</Link>
            <Link to="#" className="hover:text-indigo-500">سياسة الخصوصية</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
