import React, { useState, useEffect } from "react";
import { User, CreditCard, Clock, Bell, Wallet, Settings, Camera } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";

const GOVERNORATES = [
  "دمشق", "ريف دمشق", "حلب", "حمص", "حماة", "اللاذقية", "طرطوس",
  "إدلب", "درعا", "السويداء", "القنيطرة", "دير الزور", "الرقة", "الحسكة"
];

export function UserDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "profile";
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  // Profile Form State
  const [profileData, setProfileData] = useState({
    displayName: "",
    phoneNumber: "",
    birthDate: "",
    governorate: "",
    walletBalance: 0
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  useEffect(() => {
    if (user) {
      // Pre-fill from the current user object/firestore if we fetch it, for now we match what's in AuthContext user
      // Actually we should fetch from firestore if not completely available in context
      // But we can just use onSnapshot on the user document for simplicity
      const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const d = docSnap.data();
          setProfileData({
            displayName: d.displayName || "",
            phoneNumber: d.phoneNumber || "",
            birthDate: d.birthDate || "",
            governorate: d.governorate || "",
            walletBalance: d.walletBalance || 0
          });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, "users");
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "transactions"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs: any[] = [];
      snapshot.forEach(d => {
        txs.push({id: d.id, ...d.data()});
      });
      txs.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setTransactions(txs);
      setLoadingTransactions(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "transactions");
    });

    return () => unsubscribe();
  }, [user]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleProfileSave = async () => {
    if (!user) return;
    setProfileSaving(true);
    setProfileMessage("");
    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName: profileData.displayName,
        phoneNumber: profileData.phoneNumber,
        birthDate: profileData.birthDate,
        governorate: profileData.governorate,
        updatedAt: serverTimestamp()
      });
      setProfileMessage("تم حفظ التعديلات بنجاح!");
      setTimeout(() => setProfileMessage(""), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "users");
      setProfileMessage("حدث خطأ أثناء الحفظ.");
    } finally {
      setProfileSaving(false);
    }
  };

  const tabs = [
    { id: "profile", name: "الملف الشخصي", icon: <User size={18} /> },
    { id: "saved", name: "الخدمات المحفوظة", icon: <CreditCard size={18} /> },
    { id: "orders", name: "سجل الطلبات", icon: <Clock size={18} /> },
    { id: "wallet", name: "المحفظة", icon: <Wallet size={18} /> },
    { id: "notifications", name: "الإشعارات", icon: <Bell size={18} /> },
  ];

  const handleTabChange = (id: string) => {
    setSearchParams({ tab: id });
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">الرجاء تسجيل الدخول أولاً.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">حسابي</h1>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-64 shrink-0">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden sticky top-28">
              <nav className="flex flex-col p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all ${
                      currentTab === tab.id
                        ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <div className={currentTab === tab.id ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}>
                      {tab.icon}
                    </div>
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 md:p-8 min-h-[400px]"
              >
                {currentTab === "profile" && (
                  <div>
                    <h2 className="text-2xl font-bold mb-8 items-center flex gap-2">
                      <Settings className="text-indigo-500" /> إعدادات الملف الشخصي
                    </h2>
                    
                    <div className="flex flex-col md:flex-row gap-8 mb-8">
                      <div className="relative w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 border-4 border-white dark:border-slate-800 shadow-lg">
                        <User size={40} className="text-slate-400" />
                        <button className="absolute bottom-0 right-0 p-1.5 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition-colors">
                          <Camera size={14} />
                        </button>
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">الاسم الكامل</label>
                            <input name="displayName" value={profileData.displayName} onChange={handleProfileChange} type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 transition-colors" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">رقم الهاتف</label>
                            <input name="phoneNumber" value={profileData.phoneNumber} onChange={handleProfileChange} type="tel" className="font-en dir-ltr w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 transition-colors" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">المحافظة</label>
                            <select name="governorate" value={profileData.governorate} onChange={handleProfileChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 transition-colors appearance-none">
                              <option value="" disabled>اختر المحافظة</option>
                              {GOVERNORATES.map(gov => (
                                <option key={gov} value={gov}>{gov}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">تاريخ الميلاد</label>
                            <input name="birthDate" value={profileData.birthDate} onChange={handleProfileChange} type="date" className="w-full font-en bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 transition-colors" />
                          </div>
                        </div>
                        
                        <div className="pt-4 flex items-center justify-between">
                          <p className={`text-sm font-bold transition-opacity ${profileMessage ? 'opacity-100' : 'opacity-0'} ${profileMessage.includes("نجاح") ? 'text-emerald-500' : 'text-red-500'}`}>
                            {profileMessage}
                          </p>
                          <button onClick={handleProfileSave} disabled={profileSaving} className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50">
                            {profileSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}


                {currentTab === "saved" && (
                  <div>
                    <h2 className="text-2xl font-bold mb-6">الخدمات المحفوظة</h2>
                    <p className="text-slate-500 mb-6">اشحن خدماتك المفضلة بنقرة واحدة السعر يتحدث تلقائياً.</p>
                    
                    <div className="text-center py-8 text-slate-500 border border-slate-100 dark:border-slate-700 rounded-2xl border-dashed">
                      لا توجد خدمات محفوظة حالياً.
                    </div>
                  </div>
                )}

                {currentTab === "orders" && (
                  <div>
                    <h2 className="text-2xl font-bold mb-6">سجل الطلبات</h2>
                    <div className="space-y-4">
                      {loadingTransactions ? (
                        <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
                      ) : transactions.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-2xl">
                           <Clock className="mx-auto w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                           <p className="text-slate-500 text-lg">لا توجد طلبات سابقة.</p>
                        </div>
                      ) : transactions.map((tx) => (
                        <div key={tx.id} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${tx.status === 'مكتمل' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20' : tx.status === 'مرفوض' ? 'bg-red-100 text-red-600 dark:bg-red-500/20' : 'bg-amber-100 text-amber-600 dark:bg-amber-500/20'}`}>
                              <Clock size={24} />
                            </div>
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                 <h3 className="font-bold text-lg text-slate-800 dark:text-white">{tx.serviceName}</h3>
                                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${tx.status === 'مكتمل' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : tx.status === 'مرفوض' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'}`}>
                                   {tx.status}
                                 </span>
                               </div>
                               <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                                 <span className="flex items-center gap-1 font-medium">{tx.company}</span>
                                 <span>•</span>
                                 <span className="font-en text-xs">{tx.id.slice(0, 8).toUpperCase()}</span>
                                 <span>•</span>
                                 <span>{new Date(tx.createdAt?.toMillis() || Date.now()).toLocaleDateString('ar-SY', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                               </div>
                            </div>
                          </div>
                          <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center border-t border-slate-200 dark:border-slate-700 md:border-0 pt-4 md:pt-0">
                            <span className="text-slate-500 text-sm mb-1 hidden md:block">المبلغ الإجمالي</span>
                            <span className="font-bold text-xl text-indigo-600 dark:text-indigo-400 font-en">{tx.amount?.toLocaleString() || 0} <span className="font-sans text-sm font-medium">ل.س</span></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentTab === "wallet" && (
                  <div>
                    <h2 className="text-2xl font-bold mb-6">المحفظة</h2>
                    <div className="bg-slate-800 dark:bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden mb-8 border border-slate-700">
                      <div className="relative z-10">
                        <p className="text-slate-400 text-sm mb-2 font-medium">إجمالي المحفظة</p>
                        <h2 className="text-4xl font-bold mb-8 font-en">{profileData.walletBalance?.toLocaleString()} <span className="text-xl font-normal opacity-60 font-sans">ل.س</span></h2>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => alert("لشحن رصيدك، يرجى مراجعة أقرب وكيل معتمد أو التواصل مع الدعم الفني.")}
                            className="flex-1 py-3.5 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/25"
                          >
                            تغذية الرصيد
                          </button>
                          <button 
                            onClick={() => alert("ميزة التحويل ستتوفر قريباً للعملاء الموثقين.")}
                            className="flex-1 py-3.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-all"
                          >
                            تحويل
                          </button>
                        </div>
                      </div>
                      <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-indigo-500/30 rounded-full blur-[64px]"></div>
                      <div className="absolute top-10 -left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-[48px]"></div>
                    </div>
                    
                    <h3 className="text-lg font-bold mb-4 mt-8">أحدث الحركات</h3>
                    <div className="space-y-3">
                       {transactions.slice(0, 5).map(tx => (
                         <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                  <CreditCard size={18} />
                               </div>
                               <div>
                                  <p className="font-bold text-sm">{tx.serviceName}</p>
                                  <p className="text-[10px] text-slate-500">{new Date(tx.createdAt?.toMillis() || Date.now()).toLocaleDateString('ar-SY')}</p>
                               </div>
                            </div>
                            <p className="font-bold font-en text-red-500">-{tx.amount?.toLocaleString()} ل.س</p>
                         </div>
                       ))}
                       {transactions.length === 0 && (
                          <div className="text-center py-8 text-slate-500 border border-slate-100 dark:border-slate-700 rounded-2xl border-dashed">
                            <Wallet size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                            <p>لا توجد حركات سابقة في محفظتك.</p>
                          </div>
                       )}
                    </div>
                  </div>
                )}

                {currentTab === "notifications" && (
                  <div className="space-y-4">
                     <h2 className="text-2xl font-bold mb-6">الإشعارات</h2>
                     <div className="p-8 text-center text-slate-500">لا توجد إشعارات حالياً.</div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
