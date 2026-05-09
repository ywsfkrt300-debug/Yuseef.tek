import { useState, useEffect } from "react";
import { collection, onSnapshot, query, doc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { Search, User as UserIcon, Shield, CreditCard, Mail, Phone, Calendar, MapPin, MoreVertical, Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [amountToAdd, setAmountToAdd] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const u: any[] = [];
      snapshot.forEach(doc => {
        u.push({ id: doc.id, ...doc.data() });
      });
      setUsers(u);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "users");
    });
    return () => unsubscribe();
  }, []);

  const filteredUsers = users.filter(user => 
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phoneNumber?.includes(searchTerm)
  );

  const addBalance = async (userId: string) => {
    if (!amountToAdd || isNaN(Number(amountToAdd))) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "users", userId), {
        walletBalance: increment(Number(amountToAdd)),
        updatedAt: serverTimestamp()
      });
      setAmountToAdd("");
      setSelectedUser(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "users");
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleAdmin = async (user: any) => {
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "users", user.id), {
        role: user.role === "admin" ? "user" : "admin",
        updatedAt: serverTimestamp()
      });
      if (selectedUser?.id === user.id) {
         setSelectedUser({...selectedUser, role: user.role === "admin" ? "user" : "admin"});
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "users");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">المستخدمون</h1>
          <p className="text-slate-500 dark:text-slate-400">إدارة حسابات المستخدمين، الأرصدة، والصلاحيات</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="relative mb-6">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="ابحث بالاسم، البريد، أو رقم الهاتف..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-12 pl-4 py-3.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-sm border-b border-slate-100 dark:border-slate-700">
                <th className="p-4 font-medium rounded-tr-xl">المستخدم</th>
                <th className="p-4 font-medium">الرصيد</th>
                <th className="p-4 font-medium">نوع الحساب</th>
                <th className="p-4 font-medium text-center rounded-tl-xl">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 italic">جاري التحميل...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 italic">لا يوجد مستخدمون مطابقون لبحثك.</td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id} className="text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                        <UserIcon size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold truncate">{user.displayName || "مستخدم جديد"}</p>
                        <p className="text-xs text-slate-500 truncate font-en">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-bold font-en text-indigo-500">
                    {user.walletBalance?.toLocaleString()} SP
                  </td>
                  <td className="p-4">
                    {user.role === "admin" ? (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 rounded-lg text-xs font-bold border border-amber-200 dark:border-amber-500/30 flex items-center gap-1 w-fit">
                        <Shield size={12} /> مشرف
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-600 w-fit">
                        مستخدم عادي
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                       <button 
                         onClick={() => setSelectedUser(user)}
                         className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                         title="إدارة الرصيد"
                       >
                         <CreditCard size={18} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Dashboard / Balance Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { if(!isUpdating) setSelectedUser(null); }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-indigo-500 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">{selectedUser.displayName}</h3>
                  <p className="text-indigo-100 text-sm font-en">{selectedUser.email}</p>
                </div>
                <button onClick={() => setSelectedUser(null)} disabled={isUpdating} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <XCircle size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                      <p className="text-xs text-slate-500 mb-1">الرصيد الحالي</p>
                      <p className="text-xl font-bold font-en text-indigo-500">{selectedUser.walletBalance?.toLocaleString()} SP</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                      <p className="text-xs text-slate-500 mb-1">حالة الحساب</p>
                      <p className="font-bold">{selectedUser.role === "admin" ? "مشرف" : "مستخدم"}</p>
                    </div>
                 </div>

                 <div className="space-y-3">
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">إضافة رصيد (شحن الحساب)</label>
                   <div className="flex gap-2">
                     <div className="relative flex-1">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-en">SP</span>
                       <input 
                         type="number" 
                         value={amountToAdd} 
                         onChange={(e) => setAmountToAdd(e.target.value)}
                         placeholder="أدخل المبلغ..."
                         className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-indigo-500 transition-colors font-en"
                       />
                     </div>
                     <button 
                        onClick={() => addBalance(selectedUser.id)}
                        disabled={isUpdating || !amountToAdd}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                     >
                       <Plus size={20} /> إضافة
                     </button>
                   </div>
                 </div>

                 <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                   <button 
                     onClick={() => toggleAdmin(selectedUser)}
                     disabled={isUpdating}
                     className={`w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                       selectedUser.role === "admin" 
                       ? "border-2 border-red-500 text-red-500 hover:bg-red-50" 
                       : "border-2 border-amber-500 text-amber-500 hover:bg-amber-50"
                     }`}
                   >
                     <Shield size={20} />
                     {selectedUser.role === "admin" ? "إلغاء صلاحيات المشرف" : "منح صلاحيات المشرف"}
                   </button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function XCircle({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}
