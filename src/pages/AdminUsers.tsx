import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, doc, updateDoc, serverTimestamp, increment, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { Search, User as UserIcon, Shield, CreditCard, Mail, Phone, Calendar, MapPin, MoreVertical, Plus, ChevronRight, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Fuse from "fuse.js";
import { toast } from "react-hot-toast";

export function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [amountToAdd, setAmountToAdd] = useState("");
  const [balanceNote, setBalanceNote] = useState("");
  const [addBalanceStep, setAddBalanceStep] = useState(1);
  const [dailyLimit, setDailyLimit] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardStatus, setCardStatus] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [viewType, setViewType] = useState<"table" | "cards">("cards");
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  const toggleCardFlip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFlippedCards(prev => ({...prev, [id]: !prev[id]}));
  };

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

  const fuse = useMemo(() => {
    return new Fuse(users, {
      keys: [
        "displayName",
        "email",
        "phoneNumber"
      ],
      threshold: 0.3,
      distance: 100,
      ignoreLocation: true
    });
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    return fuse.search(searchTerm).map(result => result.item);
  }, [fuse, searchTerm, users]);

  const addBalance = async (user: any) => {
    if (!amountToAdd || isNaN(Number(amountToAdd))) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "users", user.id), {
        walletBalance: increment(Number(amountToAdd)),
        updatedAt: serverTimestamp()
      });
      
      const transactionRef = doc(collection(db, "transactions"));
      await setDoc(transactionRef, {
         userId: user.id,
         userEmail: user.email,
         type: "deposit",
         amount: Number(amountToAdd),
         status: "completed",
         method: "admin",
         description: balanceNote || "شحن محفظة من قبل المشرف",
         createdAt: serverTimestamp()
      });

      toast.success("تم شحن المحفظة بنجاح!");
      setAmountToAdd("");
      setBalanceNote("");
      setAddBalanceStep(1);
      // close modal or just let it reflect changes
      if (selectedUser?.id === user.id) {
         setSelectedUser({...selectedUser, walletBalance: (selectedUser.walletBalance || 0) + Number(amountToAdd)});
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء الشحن");
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const updateDailyLimit = async (user: any) => {
     if (!dailyLimit || isNaN(Number(dailyLimit))) return;
     setIsUpdating(true);
     try {
       await updateDoc(doc(db, "users", user.id), {
         dailyServiceLimit: Number(dailyLimit),
         updatedAt: serverTimestamp()
       });
       toast.success("تم تحديث الحد اليومي بنجاح");
       if (selectedUser?.id === user.id) {
         setSelectedUser({...selectedUser, dailyServiceLimit: Number(dailyLimit)});
       }
     } catch (error) {
        toast.error("حدث خطأ أثناء التحديث");
     } finally {
        setIsUpdating(false);
     }
  };

  const updateCardExpiry = async (user: any) => {
    if (!cardExpiry) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "users", user.id), {
        cardExpiryDate: cardExpiry,
        updatedAt: serverTimestamp()
      });
      toast.success("تم تحديث صلاحية البطاقة بنجاح");
      setCardExpiry("");
      if (selectedUser?.id === user.id) {
        setSelectedUser({...selectedUser, cardExpiryDate: cardExpiry});
      }
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, "users");
    } finally {
       setIsUpdating(false);
    }
  };

  const updateCardDetails = async (user: any) => {
    if (!cardNumber && !cardCvv) return;
    setIsUpdating(true);
    try {
      const updates: any = { updatedAt: serverTimestamp() };
      if (cardNumber) updates.cardNumber = cardNumber;
      if (cardCvv) updates.cardCvv = cardCvv;

      await updateDoc(doc(db, "users", user.id), updates);
      toast.success("تم تحديث بيانات البطاقة بنجاح");
      
      if (selectedUser?.id === user.id) {
        setSelectedUser({...selectedUser, ...updates});
      }
      setCardNumber("");
      setCardCvv("");
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, "users");
    } finally {
       setIsUpdating(false);
    }
  };

  const updateCardStatus = async (user: any) => {
    if (!cardStatus) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "users", user.id), {
        cardStatus: cardStatus,
        updatedAt: serverTimestamp()
      });
      toast.success("تم تحديث حالة البطاقة بنجاح");
      setCardStatus("");
      if (selectedUser?.id === user.id) {
        setSelectedUser({...selectedUser, cardStatus: cardStatus});
      }
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
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="ابحث بالاسم، البريد، أو رقم الهاتف..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-12 pl-4 py-3.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 shrink-0">
            <button
              onClick={() => setViewType("cards")}
              className={`px-4 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${viewType === "cards" ? "bg-white dark:bg-slate-700 text-indigo-500 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              البطاقات
            </button>
            <button
              onClick={() => setViewType("table")}
              className={`px-4 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${viewType === "table" ? "bg-white dark:bg-slate-700 text-indigo-500 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              الجدول
            </button>
          </div>
        </div>

        {viewType === "table" ? (
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full p-8 text-center text-slate-500 italic">جاري التحميل...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="col-span-full p-8 text-center text-slate-500 italic">لا يوجد مستخدمون مطابقون لبحثك.</div>
            ) : filteredUsers.map((user) => (
              <div 
                key={user.id} 
                className="w-full h-[220px] relative cursor-pointer group"
                style={{ perspective: "1000px" }}
                onClick={(e) => toggleCardFlip(user.id, e)}
              >
                <motion.div
                  className="w-full h-full relative"
                  animate={{ rotateY: flippedCards[user.id] ? 180 : 0 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* Front */}
                  <div 
                    className="absolute inset-0 w-full h-full"
                    style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
                  >
                    <div className="w-full h-full rounded-[24px] p-5 flex flex-col justify-between overflow-hidden shadow-[0_20px_35px_-10px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_35px_-10px_rgba(0,0,0,0.5)] bg-gradient-to-br from-[#0F172A] to-[#1E3A8A] transition-transform group-hover:-translate-y-1">
                       <div className="absolute -top-[30%] -right-[20%] w-[200px] h-[200px] bg-white/5 rounded-full pointer-events-none"></div>
                       <div className="absolute -bottom-[20%] -left-[10%] w-[150px] h-[150px] bg-white/5 rounded-full pointer-events-none"></div>

                       <div className="flex justify-between items-start relative z-10">
                         <div className="text-right text-lg font-bold text-white tracking-wide font-en">
                           Syria Pay
                         </div>
                         {user.role === "admin" && (
                           <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[10px] font-bold border border-amber-500/30 flex items-center gap-1">
                             <Shield size={10} /> مشرف
                           </span>
                         )}
                       </div>

                       <div className="relative z-10 dir-ltr text-left">
                         <div className="text-xl sm:text-2xl tracking-[2px] font-['Courier_New'] font-semibold text-white mb-1 truncate">
                           {user.email}
                         </div>
                         <div className="text-[10px] text-white/50 tracking-widest font-en uppercase truncate pb-1">
                           {user.displayName || "مستخدم جديد"}
                         </div>
                       </div>

                       <div className="flex justify-between items-end relative z-10 flex-wrap gap-2">
                         <div className="text-[11px] text-white/60 uppercase tracking-wide font-en text-left dir-ltr">
                           BALANCE
                           <div className="mt-1 w-full max-w-[120px] h-[2px] bg-white/30 rounded-sm"></div>
                         </div>
                         <div className="text-sm sm:text-base font-bold text-[#10B981] bg-[#10B981]/15 px-3 py-1 rounded-full tracking-wide shrink-0 font-en border border-emerald-500/20 shadow-inner">
                           {user.walletBalance?.toLocaleString() || 0} SP
                         </div>
                       </div>
                    </div>
                  </div>

                  {/* Back */}
                  <div 
                    className="absolute inset-0 w-full h-full"
                    style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                  >
                    <div className="w-full h-full rounded-[24px] relative overflow-hidden shadow-[0_20px_35px_-10px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_35px_-10px_rgba(0,0,0,0.5)] bg-gradient-to-r from-[#1E293B] to-[#0F172A] flex flex-col items-center justify-center p-6">
                       <button 
                         onClick={(e) => { e.stopPropagation(); setSelectedUser(user); }}
                         className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold transition-all shadow-lg flex items-center justify-center gap-2 mb-3"
                       >
                         <CreditCard size={18} />
                         إدارة رصيد البطاقة
                       </button>
                       <div className="text-[10px] text-white/50 text-center font-en break-all">
                         ID: {user.id}
                       </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        )}
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

                 <div className="space-y-4">
                   <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">شحن المحفظة</label>
                     {addBalanceStep === 1 ? (
                       <div className="space-y-3">
                         <div className="relative">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-en">SP</span>
                           <input 
                             type="number" 
                             value={amountToAdd} 
                             onChange={(e) => setAmountToAdd(e.target.value)}
                             placeholder="المبلغ المراد شحنه..."
                             className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors font-en"
                           />
                         </div>
                         <input 
                           type="text" 
                           value={balanceNote} 
                           onChange={(e) => setBalanceNote(e.target.value)}
                           placeholder="ملاحظات (اختياري)"
                           className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                         />
                         <button 
                            onClick={() => amountToAdd && setAddBalanceStep(2)}
                            disabled={!amountToAdd}
                            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                         >
                           متابعة الشحن <ChevronRight className="rotate-180" size={18} />
                         </button>
                       </div>
                     ) : (
                        <div className="space-y-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                          <p className="text-center text-sm font-bold mb-2">تأكيد عملية الشحن</p>
                          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-2 rounded-lg">
                             <span className="text-slate-500 text-sm">المبلغ:</span>
                             <span className="font-bold text-indigo-500 font-en">{Number(amountToAdd).toLocaleString()} SP</span>
                          </div>
                          <div className="flex gap-2 pt-2">
                             <button 
                               onClick={() => addBalance(selectedUser)}
                               disabled={isUpdating}
                               className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                             >
                                <Check size={18} /> تأكيد الشحن
                             </button>
                             <button 
                               onClick={() => setAddBalanceStep(1)}
                               disabled={isUpdating}
                               className="px-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-all"
                             >
                               إلغاء
                             </button>
                          </div>
                        </div>
                     )}
                   </div>

                   <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">الحد اليومي لطلبات الخدمات</label>
                     <div className="flex gap-2">
                       <input 
                         type="number" 
                         value={dailyLimit !== "" ? dailyLimit : (selectedUser.dailyServiceLimit || "")} 
                         onChange={(e) => setDailyLimit(e.target.value)}
                         placeholder="بدون حد"
                         className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors font-en"
                       />
                       <button 
                          onClick={() => updateDailyLimit(selectedUser)}
                          disabled={isUpdating || !dailyLimit}
                          className="bg-slate-800 hover:bg-slate-900 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-6 rounded-xl font-bold transition-all disabled:opacity-50"
                       >
                         تحديث
                       </button>
                     </div>
                     <p className="text-xs text-slate-500 mt-2">اتركه فارغاً أو صفر لجعله بلا حدود.</p>
                   </div>
                   
                   <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">بيانات البطاقة (الرقم و CVV)</label>
                     <div className="space-y-3">
                        <div className="relative">
                          <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            type="text" 
                            value={cardNumber !== "" ? cardNumber : (selectedUser.cardNumber || "")} 
                            onChange={(e) => setCardNumber(e.target.value)}
                            placeholder="رقم البطاقة (16 رقم)..."
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors font-en"
                          />
                          <button 
                            onClick={() => {
                              const randomNum = Array.from({length: 4}, () => Math.floor(Math.random() * 9000 + 1000)).join('');
                              setCardNumber(randomNum);
                              const randomCvv = Math.floor(Math.random() * 899 + 100).toString();
                              setCardCvv(randomCvv);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-[10px] font-bold transition-all"
                          >
                            توليد عشوائي
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={cardCvv !== "" ? cardCvv : (selectedUser.cardCvv || "")} 
                            onChange={(e) => setCardCvv(e.target.value)}
                            placeholder="رمز CVV..."
                            maxLength={3}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors font-en text-center"
                          />
                          <button 
                             onClick={() => updateCardDetails(selectedUser)}
                             disabled={isUpdating || (!cardNumber && !cardCvv)}
                             className="bg-slate-800 hover:bg-slate-900 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-8 rounded-xl font-bold transition-all disabled:opacity-50"
                          >
                             تحديث
                          </button>
                        </div>
                     </div>
                     <p className="text-xs text-slate-500 mt-2">تحديث رقم البطاقة ورمز الأمان المعروض للمستخدم.</p>
                   </div>

                   <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">تاريخ صلاحية البطاقة</label>
                     <div className="flex gap-2">
                       <div className="flex gap-2 flex-1 dir-ltr">
                         <select 
                           value={cardExpiry ? cardExpiry.split('/')[0] : (selectedUser.cardExpiryDate?.split('/')[0] || "12")}
                           onChange={(e) => {
                             const [, yy] = (cardExpiry || selectedUser.cardExpiryDate || "12/28").split('/');
                             setCardExpiry(`${e.target.value}/${yy || "28"}`);
                           }}
                           className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors font-en text-center appearance-none"
                         >
                           {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(m => (
                             <option key={m} value={m}>{m}</option>
                           ))}
                         </select>
                         <span className="text-xl font-bold text-slate-400 self-center">/</span>
                         <select 
                           value={cardExpiry ? cardExpiry.split('/')[1] : (selectedUser.cardExpiryDate?.split('/')[1] || "28")}
                           onChange={(e) => {
                             const [mm, ] = (cardExpiry || selectedUser.cardExpiryDate || "12/28").split('/');
                             setCardExpiry(`${mm || "12"}/${e.target.value}`);
                           }}
                           className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors font-en text-center appearance-none"
                         >
                           {Array.from({ length: 15 }, (_, i) => (24 + i).toString()).map(y => (
                             <option key={y} value={y}>{y}</option>
                           ))}
                         </select>
                       </div>
                       <button 
                          onClick={() => updateCardExpiry(selectedUser)}
                          disabled={isUpdating || (!cardExpiry && !selectedUser.cardExpiryDate)}
                          className="bg-slate-800 hover:bg-slate-900 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-6 rounded-xl font-bold transition-all disabled:opacity-50"
                       >
                         تحديث
                       </button>
                     </div>
                     <p className="text-xs text-slate-500 mt-2">لتحديث التاريخ المعروض على واجهة بطاقة المستخدم (Card Expiry).</p>
                   </div>

                   <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">حالة البطاقة</label>
                     <div className="flex gap-2">
                       <select 
                         value={cardStatus !== "" ? cardStatus : (selectedUser.cardStatus || "active")} 
                         onChange={(e) => setCardStatus(e.target.value)}
                         className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                       >
                         <option value="active">فعالة (Active)</option>
                         <option value="expired">منتهية الصلاحية (Expired)</option>
                         <option value="blocked">محظورة (Blocked)</option>
                       </select>
                       <button 
                          onClick={() => updateCardStatus(selectedUser)}
                          disabled={isUpdating}
                          className="bg-slate-800 hover:bg-slate-900 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-6 rounded-xl font-bold transition-all disabled:opacity-50"
                       >
                         تحديث
                       </button>
                     </div>
                     <p className="text-xs text-slate-500 mt-2">تحديث حالة البطاقة المعروضة للمستخدم.</p>
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
