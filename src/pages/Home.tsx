import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Zap, Phone, Wifi, Droplet, CheckCircle2, ChevronLeft } from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useServices } from "../hooks/useServices";
import { useTransactions } from "../hooks/useTransactions";
import { ServiceIcon } from "../components/ServiceIcon";

export function Home() {
  const { user } = useAuth();
  const isLogged = !!user;
  const { services, loading } = useServices(true);
  const { transactions, loading: loadingTx } = useTransactions(4);

  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    const qCats = query(collection(db, "categories"), where("isActive", "==", true));
    const unsubscribe = onSnapshot(qCats, (snapshot) => {
      const cats: any[] = [];
      snapshot.forEach(doc => cats.push({ id: doc.id, ...doc.data() }));
      setCategories(cats);
    }, (error) => {
      // Non-critical background list, just log or silent
      console.error("Categories fetch error:", error);
    });
    return () => unsubscribe();
  }, []);

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          service.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || service.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const quickActions = filteredServices.slice(0, 4);

  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* Hero Section */}
      <section className="relative mt-24 mb-6 mx-4 sm:mx-6 lg:mx-8 bg-white dark:bg-slate-800 rounded-[32px] p-8 md:p-12 border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden text-right">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-50/50 dark:from-indigo-500/10 to-transparent flex items-center justify-center opacity-40 mix-blend-multiply dark:mix-blend-screen pointer-events-none">
          <svg className="w-64 h-64 text-indigo-200 dark:text-indigo-900" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M44.7,-76.4C58.1,-69.2,70.3,-58.5,78.2,-45.3C86.1,-32.1,89.7,-16,87.9,-0.9C86.2,14.2,79,28.4,69.5,40C60.1,51.6,48.3,60.6,35.4,67.3C22.6,74,8.6,78.3,-5.7,77.3C-20,76.3,-34.5,70,-46.8,61C-59.1,52,-69.2,40.3,-74.6,26.7C-80,13.2,-80.7,-2.1,-77,-16.1C-73.4,-30.1,-65.4,-42.8,-54.6,-50.9C-43.8,-59,-30.1,-62.5,-16.8,-70.7C-3.4,-78.9,9.5,-91.7,24.5,-90.4C39.6,-89.1,44.7,-76.4,44.7,-76.4Z" transform="translate(100 100)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-2xl">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl lg:text-7xl font-extrabold text-slate-800 dark:text-white mb-4 leading-tight"
          >
            كل خدماتك المالية <br className="hidden md:block" />
            <span className="text-indigo-500">في مكان واحد</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-slate-500 dark:text-slate-400 mb-8"
          >
            ادفع فواتيرك واشحن باقات الإنترنت خلال ثوانٍ معدودة وبأعلى معايير الأمان المتاحة.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative flex flex-col gap-6 mb-10 max-w-xl"
          >
            <div className="relative flex items-center">
              <input 
                type="text" 
                placeholder="اكتب اسم الخدمة أو الشركة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-16 pr-14 pl-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900 dark:text-white"
              />
              <div className="absolute right-5 text-slate-400">
                <Search className="w-6 h-6" />
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
               <button 
                 onClick={() => setSelectedCategory("all")}
                 className={`px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap border shrink-0 ${
                   selectedCategory === "all" 
                   ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20" 
                   : "bg-white dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-700 hover:border-indigo-500"
                 }`}
               >
                 الكل
               </button>
               {categories.map(cat => (
                 <button 
                   key={cat.id}
                   onClick={() => setSelectedCategory(cat.id)}
                   className={`px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap border shrink-0 ${
                     selectedCategory === cat.id 
                     ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20" 
                     : "bg-white dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-700 hover:border-indigo-500"
                   }`}
                 >
                   {cat.name}
                 </button>
               ))}
            </div>
          </motion.div>

          {!isLogged && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-3"
            >
              <span className="text-slate-500 dark:text-slate-400">مشترك جديد؟</span>
              <Link to="/auth" className="flex items-center gap-1 font-bold text-indigo-500 hover:text-indigo-600 transition-colors">
                إنشاء حساب مجاني
                <ChevronLeft className="w-4 h-4" />
              </Link>
            </motion.div>
          )}
        </div>
      </section>

      {/* Quick Actions (My Services) */}
      <section className="py-12 -mt-10 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-nowrap md:flex-wrap gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {quickActions.map((service, i) => (
              <motion.div 
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="min-w-[160px] md:min-w-[180px] flex-1 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group cursor-pointer snap-center"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform overflow-hidden ${service.iconBgClass || 'bg-indigo-50 dark:bg-indigo-500/10'}`}>
                  {service.imageUrl ? (
                    <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <ServiceIcon type={service.iconType} className={`w-6 h-6 ${service.iconTextClass || 'text-indigo-500'}`} />
                  )}
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-1">{service.name}</h3>
                <p className="text-xs text-slate-400">
                  السعر: <span className="font-bold text-indigo-500 font-en">{service.dynamicPrice ? "حسب الفاتورة" : `${service.price.toLocaleString()} ل.س`}</span>
                </p>
                <Link to={`/service/${service.id}`} className="block mt-4 w-full py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-lg text-center hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-white transition-colors">
                  طلب سريع
                </Link>
              </motion.div>
            ))}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="min-w-[160px] md:min-w-[180px] flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-5 cursor-pointer flex flex-col items-center justify-center text-slate-400 hover:text-indigo-500 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all snap-center"
            >
              <div className="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center mb-2">
                <span className="text-xl leading-none">+</span>
              </div>
              <span className="font-medium text-sm">إضافة خدمة</span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Services */}
      <section id="services" className="py-16 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">الخدمات المميزة</h2>
              <p className="text-slate-500 dark:text-slate-400">أكثر الخدمات طلباً في مكان واحد</p>
            </div>
            <Link to="/services" className="text-indigo-500 font-bold hover:text-indigo-600 hidden sm:flex items-center gap-1">
              عرض الكل <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-12 text-slate-500">جاري تحميل الخدمات...</div>
            ) : filteredServices.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-500">لا توجد خدمات تطابق بحثك.</div>
            ) : (
              filteredServices.map((service) => (
                <motion.div 
                  key={service.id}
                  whileHover={{ y: -4 }}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group cursor-pointer flex flex-col h-full"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform overflow-hidden ${service.iconBgClass || 'bg-indigo-50 dark:bg-indigo-500/10'}`}>
                      {service.imageUrl ? (
                        <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <ServiceIcon type={service.iconType} className={`w-8 h-8 ${service.iconTextClass || 'text-indigo-500'}`} />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1 leading-tight">{service.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{service.company}</p>
                  </div>
                  <div className="mt-auto">
                    <div className="font-en font-bold text-indigo-500 mb-4">
                      {service.dynamicPrice ? "حسب الفاتورة" : `${service.price.toLocaleString()} ل.س`}
                    </div>
                    <Link to={`/service/${service.id}`} className="block w-full py-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-bold text-center rounded-xl hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-white transition-colors">
                      طلب سريع
                    </Link>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Recent Transactions */}
      {isLogged && (
        <section className="py-16 bg-white dark:bg-slate-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">آخر عملياتي</h2>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-sm border-b border-slate-100 dark:border-slate-700">
                      <th className="px-6 py-4 font-medium">الخدمة</th>
                      <th className="px-6 py-4 font-medium">المبلغ</th>
                      <th className="px-6 py-4 font-medium">التاريخ</th>
                      <th className="px-6 py-4 font-medium">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {loadingTx ? (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">جاري التحميل...</td></tr>
                    ) : transactions.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">لا توجد عمليات سابقة.</td></tr>
                    ) : transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">
                          {tx.serviceName}
                          <div className="text-xs text-slate-500 font-normal">{tx.company}</div>
                        </td>
                        <td className="px-6 py-4 font-en text-slate-600 dark:text-slate-300">{tx.amount?.toLocaleString()} ل.س</td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">{new Date(tx.createdAt?.toMillis() || Date.now()).toLocaleDateString('ar-SY')}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${tx.status === 'مكتمل' ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'text-amber-500 bg-amber-50 dark:bg-amber-500/10'}`}>
                            <CheckCircle2 size={14} />
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-4 text-center">
              <Link to="/user?tab=orders" className="text-sm font-bold text-indigo-500 hover:text-indigo-600">
                عرض جميع العمليات &larr;
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
