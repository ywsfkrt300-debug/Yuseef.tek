import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PlusCircle, Search, Edit2, Trash2, Power, MoreVertical, LayoutTemplate, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { doc, updateDoc, deleteDoc, collection, onSnapshot, query } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { useServices, Service } from "../hooks/useServices";
import { ServiceIcon } from "../components/ServiceIcon";
import { toast } from "react-hot-toast";

export function AdminServices() {
  const { services, loading } = useServices(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "categories"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const cats: any[] = [];
      snap.forEach(d => cats.push({ id: d.id, ...d.data() }));
      setCategories(cats);
    });
    return () => unsubscribe();
  }, []);

  const getCategoryName = (id: string) => {
    return categories.find(c => c.id === id)?.name || "—";
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleStatus = async (service: Service) => {
    setLoadingAction(service.id);
    try {
      await updateDoc(doc(db, "services", service.id), {
        isActive: !service.isActive
      });
      toast.success(service.isActive ? "تم تعطيل الخدمة" : "تم تفعيل الخدمة");
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, "services");
    } finally {
      setLoadingAction(null);
    }
  };

  const deleteService = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الخدمة؟")) return;
    setLoadingAction(id);
    try {
      await deleteDoc(doc(db, "services", id));
      toast.success("تم حذف الخدمة بنجاح");
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, "services");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">الخدمات المتاحة</h1>
          <p className="text-slate-500 dark:text-slate-400">إدارة وتفعيل خدمات الدفع والشحن في النظام</p>
        </div>
        <Link 
          to="/admin/services/new" 
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-500/20"
        >
          <PlusCircle size={20} />
          <span>إضافة خدمة جديدة</span>
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="ابحث عن اسم الخدمة أو الشركة..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-12 pl-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <Link 
              to="/admin/categories"
              className="px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
            >
              <LayoutTemplate size={18} />
              إدارة التصنيفات
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-sm border-b border-slate-100 dark:border-slate-700">
                <th className="p-4 font-medium rounded-tr-xl">الخدمة</th>
                <th className="p-4 font-medium">التصنيف</th>
                <th className="p-4 font-medium">نوع السعر</th>
                <th className="p-4 font-medium">الحالة</th>
                <th className="p-4 font-medium rounded-tl-xl text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">جاري التحميل...</td>
                </tr>
              ) : filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">لا توجد خدمات تطابق بحثك.</td>
                </tr>
              ) : filteredServices.map((service) => (
                <tr key={service.id} className="text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {service.imageUrl ? (
                        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-100 dark:border-slate-700">
                          <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      ) : (
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${service.iconBgClass || 'bg-indigo-50 dark:bg-indigo-500/10'}`}>
                          <ServiceIcon type={service.iconType} className={`w-5 h-5 ${service.iconTextClass || 'text-indigo-500'}`} />
                        </div>
                      )}
                      <div>
                        <p className="font-bold">{service.name}</p>
                        <p className="text-xs text-slate-500">{service.company}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">
                      {getCategoryName(service.categoryId || "")}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-slate-600 dark:text-slate-300">
                    {service.dynamicPrice ? "متغير" : <span className="font-en">{service.price?.toLocaleString()} SP</span>}
                  </td>
                  <td className="p-4">
                    <button 
                      disabled={loadingAction === service.id}
                      onClick={() => toggleStatus(service)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        loadingAction === service.id ? 'opacity-50' : ''
                      } ${
                        service.isActive 
                          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30' 
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      <Power size={12} />
                      {service.isActive ? 'مفعلة' : 'معطلة'}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                       <Link to={`/admin/services/edit/${service.id}`} className="p-2 text-slate-400 hover:text-indigo-500 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors">
                         <Edit2 size={16} />
                       </Link>
                       <button 
                         onClick={() => deleteService(service.id)}
                         disabled={loadingAction === service.id}
                         className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                       >
                         <Trash2 size={16} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
