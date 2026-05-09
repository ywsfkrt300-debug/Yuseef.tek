import { useState, useEffect, FormEvent } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronRight, Star, ShieldCheck, EyeOff, Eye, CreditCard, ShoppingCart, Loader2, Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { doc, getDoc, collection, setDoc, serverTimestamp, query, where, getDocs, updateDoc, increment } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { Service, ServiceField } from "../hooks/useServices";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-hot-toast";

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
  
  const [step, setStep] = useState(1);
  const [orderSummary, setOrderSummary] = useState<any>(null);
  const [checkingWallet, setCheckingWallet] = useState(false);

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

  const handleNextStep = async (e: FormEvent) => {
    e.preventDefault();
    if (!service || !user) {
      toast.error("يرجى تسجيل الدخول أولاً");
      return;
    }
    
    // Validate required fields
    for (const field of service.fields || []) {
      if (field.required && !formData[field.name]) {
         toast.error(`يرجى إدخال ${field.label}`);
         return;
      }
    }

    if (service.dynamicPrice && (!customPrice || isNaN(Number(customPrice)) || Number(customPrice) <= 0)) {
       toast.error("يرجى إدخال مبلغ صحيح");
       return;
    }

    setCheckingWallet(true);
    try {
       // Fetch user profile accurately
       const userSnap = await getDoc(doc(db, "users", user.uid));
       if (!userSnap.exists()) throw new Error("User not found");
       const userData = userSnap.data();
       const currentBalance = userData.walletBalance || 0;
       const dailyLimit = userData.dailyServiceLimit || 0; // 0 means unlimited

       // Calculate number of requests today
       let todayRequests = 0;
       if (dailyLimit > 0) {
         const startOfDay = new Date();
         startOfDay.setHours(0, 0, 0, 0);
         
         const q = query(
           collection(db, "transactions"), 
           where("userId", "==", user.uid), 
           where("createdAt", ">=", startOfDay)
         );
         const txSnap = await getDocs(q);
         // Count non-deposits
         todayRequests = txSnap.docs.filter(d => d.data().type !== "deposit").length;
         
         if (todayRequests >= dailyLimit) {
            toast.error(`لقد وصلت للحد اليومي المسموح (${dailyLimit} طلب/يوم)`);
            setCheckingWallet(false);
            return;
         }
       }

       let finalPrice = service.dynamicPrice ? Number(customPrice) : service.price;
       
       setOrderSummary({
          finalPrice,
          currentBalance,
          dailyLimit,
          todayRequests,
          insufficientBalance: currentBalance < finalPrice
       });
       
       setStep(2);
    } catch (error) {
       toast.error("حدث خطأ أثناء فحص البيانات");
    } finally {
       setCheckingWallet(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!service || !user || !orderSummary) return;
    
    // Double check balance here if we want to be secure (Firestore rules should also protect, but we can decrement wallet balance directly or wait for admin)
    // We will just create order, and if admin approves, the balance is deducted, OR we deduct it now?
    // Let's deduct it now so they can't spam requests with the same balance
    
    setSubmitting(true);
    
    try {
      if (orderSummary.insufficientBalance) {
         toast.error("الرصيد غير كافٍ لإتمام العملية");
         setSubmitting(false);
         return;
      }

      await updateDoc(doc(db, "users", user.uid), {
         walletBalance: increment(-orderSummary.finalPrice),
         updatedAt: serverTimestamp()
      });

      const transactionRef = doc(collection(db, "transactions"));
      await setDoc(transactionRef, {
        userId: user.uid,
        userEmail: user.email,
        serviceId: service.id,
        serviceName: service.name,
        company: service.company,
        amount: orderSummary.finalPrice,
        requestData: formData,
        status: "قيد المراجعة",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      toast.success("تم إرسال الطلب بنجاح!");
      navigate('/user');
    } catch (error) {
      toast.error("حدث خطأ أثناء معالجة الطلب");
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

            {step === 1 ? (
              <form className="space-y-6" onSubmit={handleNextStep}>
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
                  <button disabled={!user || checkingWallet} type="submit" className="flex-1 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:grayscale">
                    {checkingWallet ? <Loader2 className="animate-spin" size={20} /> : <ShoppingCart size={20} />}
                    {checkingWallet ? "جاري التحقق..." : "متابعة الطلب"}
                  </button>
                </div>
              </form>
            ) : (
               <motion.div 
                 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                 className="space-y-6"
               >
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
                     <h3 className="font-bold text-lg text-center mb-4 border-b border-slate-200 dark:border-slate-700 pb-4">تأكيد عملية الدفع</h3>
                     
                     <div className="space-y-3 font-en">
                        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                          <span className="font-bold font-sans text-slate-700 dark:text-slate-300">المبلغ المطلوب:</span>
                          <span className="font-bold text-lg text-slate-900 dark:text-white">{orderSummary?.finalPrice.toLocaleString()} SP</span>
                        </div>
                        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                          <span className="font-bold font-sans text-slate-700 dark:text-slate-300">رصيد المحفظة الحالي:</span>
                          <span className="font-bold text-indigo-500">{orderSummary?.currentBalance.toLocaleString()} SP</span>
                        </div>
                     </div>
                     
                     {orderSummary?.insufficientBalance ? (
                        <div className="bg-red-50 dark:bg-red-500/10 border-l-4 border-red-500 p-4 rounded-lg text-red-600 dark:text-red-400 font-medium text-sm flex items-start gap-2 mt-4">
                          <AlertCircle size={18} className="mt-0.5 shrink-0" />
                          <p>عذراً، رصيد المحفظة غير كافٍ لإتمام هذه العملية. يرجى شحن حسابك والمحاولة مرة أخرى.</p>
                        </div>
                     ) : (
                        <div className="bg-emerald-50 dark:bg-emerald-500/10 border-l-4 border-emerald-500 p-4 rounded-lg text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center gap-2 mt-4">
                          <Check size={18} />
                          <p>رصيد المحفظة يغطي قيمة الاشتراك.</p>
                        </div>
                     )}

                     {orderSummary?.dailyLimit > 0 && (
                        <p className="text-center text-xs text-slate-500 pt-2 font-en">
                          طلباتك اليوم: {orderSummary.todayRequests} / {orderSummary.dailyLimit}
                        </p>
                     )}
                  </div>

                  <div className="flex gap-4">
                     <button onClick={() => setStep(1)} disabled={submitting} className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-all disabled:opacity-50">
                        رجوع
                     </button>
                     <button 
                       onClick={handleConfirmOrder} 
                       disabled={submitting || orderSummary?.insufficientBalance} 
                       className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:grayscale"
                     >
                       {submitting ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                       {submitting ? "جاري الإرسال والتأكيد..." : "تأكيد الدفع"}
                     </button>
                  </div>
               </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
