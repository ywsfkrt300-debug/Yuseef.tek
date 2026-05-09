import { useState, useEffect, FormEvent } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronRight, Star, ShieldCheck, EyeOff, Eye, CreditCard, ShoppingCart } from "lucide-react";
import { motion } from "motion/react";
import { doc, getDoc, collection, setDoc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { Service, ServiceField } from "../hooks/useServices";
import { useAuth } from "../contexts/AuthContext";

export function ServiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [saveData, setSaveData] = useState(true);
  
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [customPrice, setCustomPrice] = useState("");

  useEffect(() => {
    async function loadService() {
      if (!id) return;
      try {
        const d = await getDoc(doc(db, "services", id));
        if (d.exists()) {
          setService({ id: d.id, ...d.data() } as Service);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `services/${id}`);
      } finally {
        setLoading(false);
      }
    }
    loadService();
  }, [id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!service || !user) return; // Add login prompt in real app
    
    setSubmitting(true);
    let finalPrice = service.dynamicPrice ? Number(customPrice) : service.price;
    
    try {
      const transactionRef = doc(collection(db, "transactions"));
      await setDoc(transactionRef, {
        userId: user.uid,
        serviceId: service.id,
        serviceName: service.name,
        company: service.company,
        amount: finalPrice,
        requestData: formData,
        status: "قيد المراجعة",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      navigate('/user');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "transactions");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;
  }

  if (!service) {
    return <div className="min-h-screen flex items-center justify-center">الخدمة غير موجودة</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-24 pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-8">
          <Link to="/" className="hover:text-indigo-500 transition-colors">الرئيسية</Link>
          <ChevronRight size={14} className="rotate-180" />
          <Link to="/#services" className="hover:text-indigo-500 transition-colors">الخدمات</Link>
          <ChevronRight size={14} className="rotate-180" />
          <span className="text-slate-900 dark:text-slate-200 font-medium truncate">{service.name}</span>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col md:flex-row md:items-center gap-6">
            <div className={`w-20 h-20 rounded-[28px] overflow-hidden shrink-0 flex items-center justify-center border-4 border-white dark:border-slate-700 shadow-xl shadow-indigo-500/10 ${!service.imageUrl ? (service.iconBgClass || 'bg-indigo-50 dark:bg-indigo-500/10') : ''}`}>
              {service.imageUrl ? (
                <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className={`text-3xl ${service.iconTextClass || 'text-indigo-500'}`}>
                   {/* This matches ServiceIcon component internally but I'll use it directly if possible or just standard Lucide based on iconType */}
                   <span className="text-4xl">
                     {service.iconType === 'wifi' ? '📶' : service.iconType === 'phone' ? '📞' : service.iconType === 'zap' ? '⚡' : service.iconType === 'droplet' ? '💧' : '📋'}
                   </span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">
                {service.company} - {service.name}
              </h1>
              
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2 text-xl font-bold text-indigo-500 font-en">
                  <span className="text-sm font-sans text-slate-500 font-normal">السعر:</span>
                  {service.dynamicPrice ? "حسب الفاتورة" : `${service.price.toLocaleString()} ل.س`}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-amber-500">
                    <Star size={18} fill="currentColor" />
                    <span className="font-bold ml-1 text-slate-700 dark:text-slate-300 mr-1 font-en">4.9</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-2 mb-6">
              <ShieldCheck className="text-indigo-500" size={24} />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">معلومات الاشتراك</h2>
            </div>

            {!user && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-400 p-4 rounded-xl mb-6 font-medium">
                يرجى تسجيل الدخول أولاً لتتمكن من إرسال الطلب وتتبعه.
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {service.fields?.map((field, i) => (
                  <div key={i} className={field.type === 'password' ? 'col-span-1 md:col-span-2' : ''}>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {field.type === 'password' ? (
                      <div className="relative">
                        <input 
                          type={showPassword ? "text" : "password"} 
                          required={field.required}
                          value={formData[field.name] || ''}
                          onChange={e => setFormData({...formData, [field.name]: e.target.value})}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors font-en text-left dir-ltr" 
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    ) : (
                      <input 
                        type={field.type} 
                        required={field.required}
                        value={formData[field.name] || ''}
                        onChange={e => setFormData({...formData, [field.name]: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" 
                      />
                    )}
                  </div>
                ))}
              </div>

              {service.dynamicPrice && (
                 <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                     المبلغ المطلوب إرساله (ل.س) <span className="text-red-500">*</span>
                   </label>
                   <input 
                     type="number" 
                     required
                     value={customPrice}
                     onChange={e => setCustomPrice(e.target.value)}
                     className="w-full bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-700/50 rounded-xl px-4 py-3.5 text-indigo-900 dark:text-indigo-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors font-en" 
                     placeholder="أدخل قيمة الفاتورة" 
                   />
                 </div>
              )}

              <div className="flex items-center gap-3 pt-2 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div className="relative flex items-center">
                  <input 
                    type="checkbox" 
                    checked={saveData}
                    onChange={(e) => setSaveData(e.target.checked)}
                    className="w-5 h-5 border-slate-300 rounded text-indigo-500 focus:ring-indigo-500 bg-white" 
                  />
                </div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  حفظ بياناتي للطلبات القادمة (للتعبئة الآلية)
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button disabled={!user || submitting} type="submit" className="flex-1 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:grayscale">
                  <ShoppingCart size={20} />
                  {submitting ? "جاري الإرسال..." : "إرسال الطلب"}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
