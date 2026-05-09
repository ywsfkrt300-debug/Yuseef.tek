import { useState, useEffect } from "react";
import { collection, onSnapshot, query, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { Shield, Check, X, Clock, AlertCircle, Eye, User, Image as FileImage } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "react-hot-toast";

export function AdminVerifications() {
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerif, setSelectedVerif] = useState<any | null>(null);
  const [adminComment, setAdminComment] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [userDetails, setUserDetails] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, "verifications"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const v: any[] = [];
      snapshot.forEach(doc => {
        v.push({ id: doc.id, ...doc.data() });
      });
      v.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setVerifications(v);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "verifications");
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedVerif) {
      async function fetchUser() {
        try {
          const uDoc = await getDoc(doc(db, "users", selectedVerif.userId));
          if (uDoc.exists()) {
            setUserDetails(uDoc.data());
          }
        } catch (error) {
          console.error(error);
        }
      }
      fetchUser();
    } else {
      setUserDetails(null);
      setAdminComment("");
    }
  }, [selectedVerif]);

  const handleUpdateStatus = async (status: "verified" | "rejected") => {
    if (!selectedVerif) return;
    setIsUpdating(true);
    try {
      // 1. Update verification document
      await updateDoc(doc(db, "verifications", selectedVerif.id), {
        status,
        adminComment,
        updatedAt: serverTimestamp()
      });

      // 2. Update user document
      await updateDoc(doc(db, "users", selectedVerif.userId), {
        verificationStatus: status,
        isVerified: status === "verified",
        updatedAt: serverTimestamp()
      });

      toast.success(status === "verified" ? "تم قبول طلب التوثيق" : "تم رفض طلب التوثيق");
      setSelectedVerif(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "verifications");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">طلبات التوثيق</h1>
        <p className="text-slate-500 dark:text-slate-400">مراجعة والتحقق من هويات المستخدمين</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-sm border-b border-slate-100 dark:border-slate-700">
                <th className="p-4 font-medium rounded-tr-xl">المستخدم</th>
                <th className="p-4 font-medium">تاريخ التقديم</th>
                <th className="p-4 font-medium">الحالة</th>
                <th className="p-4 font-medium text-center rounded-tl-xl">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 italic">جاري التحميل...</td>
                </tr>
              ) : verifications.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 italic">لا توجد طلبات توثيق بعد.</td>
                </tr>
              ) : verifications.map((v) => (
                <tr key={v.id} className="text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-sm truncate font-en">{v.userId}</p>
                  </td>
                  <td className="p-4 text-xs font-en text-slate-500">
                    {new Date(v.createdAt?.toMillis() || Date.now()).toLocaleDateString('ar-SY', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                      v.status === 'verified' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' :
                      v.status === 'rejected' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' :
                      'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                    }`}>
                      {v.status === 'verified' ? 'موثق' : v.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center">
                      <button 
                         onClick={() => setSelectedVerif(v)}
                         className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors flex items-center gap-2"
                      >
                         <Eye size={18} /> <span className="text-xs font-bold">مراجعة</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {selectedVerif && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { if(!isUpdating) setSelectedVerif(null); }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-4xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-indigo-500 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Shield size={24} />
                   </div>
                   <div>
                      <h3 className="text-xl font-bold">مراجعة طلب التوثيق</h3>
                      <p className="text-indigo-100 text-xs font-en">{selectedVerif.userId}</p>
                   </div>
                </div>
                <button onClick={() => setSelectedVerif(null)} disabled={isUpdating} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                 {/* User Info */}
                 {userDetails && (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <div>
                        <p className="text-[10px] text-slate-500 mb-0.5">الاسم</p>
                        <p className="font-bold text-sm">{userDetails.displayName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 mb-0.5">الهاتف</p>
                        <p className="font-bold text-sm font-en">{userDetails.phoneNumber}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 mb-0.5">المحافظة</p>
                        <p className="font-bold text-sm">{userDetails.governorate}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 mb-0.5">تاريخ الميلاد</p>
                        <p className="font-bold text-sm font-en">{userDetails.birthDate}</p>
                      </div>
                   </div>
                 )}

                 {/* Images */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                       <p className="text-sm font-bold flex items-center gap-2">
                          <FileImage size={16} className="text-indigo-500" /> وجه الهوية
                       </p>
                       <div className="aspect-[3/2] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black">
                          <img src={selectedVerif.idFrontUrl} className="w-full h-full object-contain" alt="Front" />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <p className="text-sm font-bold flex items-center gap-2">
                          <FileImage size={16} className="text-indigo-500" /> خلف الهوية
                       </p>
                       <div className="aspect-[3/2] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black">
                          {selectedVerif.idBackUrl ? (
                            <img src={selectedVerif.idBackUrl} className="w-full h-full object-contain" alt="Back" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 italic text-xs">لا توجد صورة</div>
                          )}
                       </div>
                    </div>
                    <div className="space-y-2">
                       <p className="text-sm font-bold flex items-center gap-2">
                          <User size={16} className="text-indigo-500" /> سلفي الهاتف
                       </p>
                       <div className="aspect-[3/2] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black">
                          {selectedVerif.selfieUrl ? (
                            <img src={selectedVerif.selfieUrl} className="w-full h-full object-contain" alt="Selfie" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 italic text-xs">لا توجد صورة</div>
                          )}
                       </div>
                    </div>
                 </div>

                 {/* Decision Area */}
                 <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-700">
                    <label className="block text-sm font-bold">ملاحظات المشرف (تظهر للمستخدم في حال الرفض)</label>
                    <textarea 
                      value={adminComment}
                      onChange={(e) => setAdminComment(e.target.value)}
                      placeholder="مثال: الصورة غير واضحة، يرجى إعادة التصوير..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 min-h-[100px] outline-none focus:border-indigo-500 transition-colors"
                    />

                    <div className="flex gap-4">
                       <button 
                         onClick={() => handleUpdateStatus("verified")}
                         disabled={isUpdating || selectedVerif.status === 'verified'}
                         className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                       >
                          <Check size={20} /> قبول التوثيق
                       </button>
                       <button 
                         onClick={() => handleUpdateStatus("rejected")}
                         disabled={isUpdating || selectedVerif.status === 'rejected'}
                         className="flex-1 border-2 border-red-500 text-red-500 hover:bg-red-50 font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                       >
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
