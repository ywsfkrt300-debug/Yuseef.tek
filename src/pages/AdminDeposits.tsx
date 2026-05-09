import { useState, useEffect } from "react";
import { collection, onSnapshot, query, doc, updateDoc, serverTimestamp, getDoc, increment, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { Briefcase, Check, X, Clock, AlertCircle, Eye, User, CreditCard, Image as FileImage, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "react-hot-toast";

export function AdminDeposits() {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeposit, setSelectedDeposit] = useState<any | null>(null);
  const [adminComment, setAdminComment] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [userDetails, setUserDetails] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, "deposits"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const d: any[] = [];
      snapshot.forEach(doc => d.push({ id: doc.id, ...doc.data() }));
      d.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setDeposits(d);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "deposits");
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedDeposit) {
      async function fetchData() {
        try {
          const uDoc = await getDoc(doc(db, "users", selectedDeposit.userId));
          if (uDoc.exists()) setUserDetails(uDoc.data());
        } catch (error) { console.error(error); }
      }
      fetchData();
    } else {
      setUserDetails(null);
      setAdminComment("");
    }
  }, [selectedDeposit]);

  const handleUpdateStatus = async (status: "approved" | "rejected") => {
    if (!selectedDeposit) return;
    setIsUpdating(true);
    try {
      // 1. Update deposit document
      await updateDoc(doc(db, "deposits", selectedDeposit.id), {
        status,
        adminComment,
        updatedAt: serverTimestamp()
      });

      // 2. If approved, increment user balance and add transaction
      if (status === "approved") {
        await updateDoc(doc(db, "users", selectedDeposit.userId), {
          walletBalance: increment(selectedDeposit.amount),
          updatedAt: serverTimestamp()
        });

        const txRef = doc(collection(db, "transactions"));
        await setDoc(txRef, {
          userId: selectedDeposit.userId,
          amount: selectedDeposit.amount,
          type: "شحن رصيد",
          status: "مكتمل",
          serviceName: "شحن محفظة",
          company: "نظام الدفع",
          createdAt: serverTimestamp()
        });
      }

      toast.success(status === "approved" ? "تم قبول طلب الشحن" : "تم رفض طلب الشحن");
      setSelectedDeposit(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "deposits");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">طلبات شحن الرصيد</h1>
        <p className="text-slate-500 dark:text-slate-400">مراجعة إيصالات الدفع وتأكيد عمليات الشحن.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-sm border-b border-slate-100 dark:border-slate-700">
                <th className="p-4 font-medium">المستخدم</th>
                <th className="p-4 font-medium">المبلغ</th>
                <th className="p-4 font-medium">التاريخ</th>
                <th className="p-4 font-medium">الحالة</th>
                <th className="p-4 font-medium text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500 italic">جاري التحميل...</td></tr>
              ) : deposits.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500 italic">لا توجد طلبات شحن حالياً.</td></tr>
              ) : deposits.map((d) => (
                <tr key={d.id} className="text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-sm truncate font-en">{d.userId.substring(0, 8)}...</p>
                  </td>
                  <td className="p-4 font-en font-bold text-indigo-500">
                    {d.amount.toLocaleString()} SP
                  </td>
                  <td className="p-4 text-xs font-en text-slate-500">
                    {new Date(d.createdAt?.toMillis() || Date.now()).toLocaleDateString('ar-SY')}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                      d.status === 'approved' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' :
                      d.status === 'rejected' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' :
                      'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                    }`}>
                      {d.status === 'approved' ? 'مقبول' : d.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center">
                      <button onClick={() => setSelectedDeposit(d)} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors flex items-center gap-2">
                         <Eye size={18} /> <span className="text-xs font-bold">مراجعة الإيصال</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedDeposit && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isUpdating && setSelectedDeposit(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
               <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-indigo-500 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <CreditCard size={24} />
                     <h3 className="text-xl font-bold">مراجعة إيصال الدفع</h3>
                  </div>
                  <button onClick={() => setSelectedDeposit(null)} className="p-2 hover:bg-white/10 rounded-lg"><X size={24} /></button>
               </div>
               <div className="p-6 overflow-y-auto space-y-6">
                  {userDetails && (
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                       <div>
                          <p className="text-[10px] text-slate-500">اسم المستخدم</p>
                          <p className="font-bold">{userDetails.displayName}</p>
                       </div>
                       <div className="text-left">
                          <p className="text-[10px] text-slate-500">مبلّغ الشحن</p>
                          <p className="font-bold text-lg text-indigo-500 font-en">{selectedDeposit.amount.toLocaleString()} SP</p>
                       </div>
                    </div>
                  )}

                  <div className="space-y-2">
                     <p className="text-sm font-bold flex items-center gap-2">
                        <FileImage size={18} className="text-indigo-500" /> صورة إشعار الدفع
                     </p>
                     <div className="aspect-[3/4] md:aspect-video rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-700 bg-black">
                        <img src={selectedDeposit.proofImageUrl} className="w-full h-full object-contain" alt="Proof" />
                     </div>
                  </div>

                  <div className="space-y-4">
                     <label className="block text-sm font-bold">ملاحظة للمستخدم (اختياري)</label>
                     <textarea 
                       value={adminComment}
                       onChange={(e) => setAdminComment(e.target.value)}
                       placeholder="اكتب رسالة للمستخدم هنا..."
                       className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 min-h-[80px] outline-none focus:border-indigo-500"
                     />
                     <div className="flex gap-4">
                        <button onClick={() => handleUpdateStatus("approved")} disabled={isUpdating || selectedDeposit.status === 'approved'} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                           <Check size={20} /> قبول الشحن
                        </button>
                        <button onClick={() => handleUpdateStatus("rejected")} disabled={isUpdating || selectedDeposit.status === 'rejected'} className="flex-1 border-2 border-red-500 text-red-500 hover:bg-red-50 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                           <X size={20} /> رفض الطلب
                        </button>
                     </div>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
