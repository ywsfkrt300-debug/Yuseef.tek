import React, { useState, useEffect } from "react";
import { User, CreditCard, Clock, Bell, Wallet, Settings, Camera, Copy, Check, Shield, Image as FileImage, AlertCircle, Loader2, X, Lock, Eye, EyeOff, Moon, Sun, Save, Globe, Smartphone, Trash2, RefreshCw, ChevronDown, MessageSquare, Plus, Send } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, setDoc, deleteDoc } from "firebase/firestore";
import { reauthenticateWithCredential, EmailAuthProvider, updatePassword, signOut } from "firebase/auth";
import { db, handleFirestoreError, OperationType, auth } from "../lib/firebase";
import { toast } from "react-hot-toast";

const GOVERNORATES = [
  "دمشق", "ريف دمشق", "حلب", "حمص", "حماة", "اللاذقية", "طرطوس",
  "إدلب", "درعا", "السويداء", "القنيطرة", "دير الزور", "الرقة", "الحسكة"
];

export function UserDashboard() {
  const { language, t, dir } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "profile";
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  const handleTabChange = (id: string) => {
    setSearchParams({ tab: id });
  };

  // Profile Form State
  const [profileData, setProfileData] = useState({
    displayName: "",
    phoneNumber: "",
    birthDate: "",
    governorate: "",
    walletBalance: 0,
    isVerified: false,
    verificationStatus: "none"
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Verification State
  const [idFront, setIdFront] = useState<string | null>(null);
  const [idBack, setIdBack] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationData, setVerificationData] = useState<any>(null);

  // Deposit State
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositMethods, setDepositMethods] = useState<any[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<any | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositProof, setDepositProof] = useState<string | null>(null);
  const [isDepositing, setIsDepositing] = useState(false);
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "personal-info": true
  });

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Saved Services state
  const [savedServices, setSavedServices] = useState<any[]>([]);

  // Password Change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordState, setPasswordState] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    if (user) {
      const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const d = docSnap.data();
          setProfileData({
            displayName: d.displayName || "",
            email: d.email || user.email || "",
            phoneNumber: d.phoneNumber || "",
            birthDate: d.birthDate || "",
            governorate: d.governorate || "",
            walletBalance: d.walletBalance || 0,
            isVerified: d.isVerified || false,
            verificationStatus: d.verificationStatus || "none",
            settings: d.settings || {
              darkMode: false,
              autoSave: true,
              language: "ar",
              notifications: true
            }
          });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, "users");
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (user && profileData.verificationStatus !== "none") {
      const unsubscribe = onSnapshot(doc(db, "verifications", user.uid), (docSnap) => {
        if (docSnap.exists()) {
          setVerificationData(docSnap.data());
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, "verifications");
      });
      return () => unsubscribe();
    }
  }, [user, profileData.verificationStatus]);

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

  useEffect(() => {
    const q = query(collection(db, "paymentMethods"), where("isActive", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ms: any[] = [];
      snapshot.forEach(doc => ms.push({ id: doc.id, ...doc.data() }));
      setDepositMethods(ms);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "paymentMethods");
    });
    return () => unsubscribe();
  }, []);

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedMethod || !depositAmount || !depositProof) {
      toast.error("يرجى إكمال جميع الحقول ورفع صورة الإيصال");
      return;
    }
    
    setIsDepositing(true);
    try {
      const depositRef = doc(collection(db, "deposits"));
      await setDoc(depositRef, {
        userId: user.uid,
        amount: Number(depositAmount),
        paymentMethodId: selectedMethod.id,
        paymentMethodName: selectedMethod.name,
        proofImageUrl: depositProof,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast.success("تم إرسال طلب الشحن، سيتم التأكد من الإيداع قريباً!");
      setIsDepositModalOpen(false);
      setDepositAmount("");
      setDepositProof(null);
      setSelectedMethod(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "deposits");
    } finally {
      setIsDepositing(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "savedServices"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const saved: any[] = [];
      snapshot.forEach(doc => saved.push({ id: doc.id, ...doc.data() }));
      setSavedServices(saved);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "savedServices");
    });
    return () => unsubscribe();
  }, [user]);

  const handleDeleteSavedService = async (id: string) => {
    try {
      await deleteDoc(doc(db, "savedServices", id));
      toast.success("تم حذف الخدمة من المحفوظات");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "savedServices");
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

    if (passwordState.newPassword.length < 6) {
      toast.error("يجب أن تكون كلمة المرور 6 أحرف على الأقل");
      return;
    }

    if (passwordState.newPassword !== passwordState.confirmPassword) {
      toast.error("كلمات المرور الجديدة غير متطابقة");
      return;
    }

    if (passwordState.newPassword === passwordState.currentPassword) {
      toast.error("كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية");
      return;
    }

    setIsChangingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, passwordState.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordState.newPassword);
      
      toast.success("تم تحديث كلمة المرور بنجاح. سيتم تسجيل خروجك...");
      
      setTimeout(async () => {
        await signOut(auth);
        navigate("/login");
      }, 2000);
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        toast.error("كلمة المرور الحالية غير صحيحة");
      } else {
        toast.error("حدث خطأ أثناء تحديث كلمة المرور. يرجى المحاولة لاحقاً.");
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const toggleSetting = async (key: string) => {
    if (!user) return;
    const newSettings = { ...profileData.settings, [key]: !((profileData.settings as any)[key]) };
    setProfileData({ ...profileData, settings: newSettings });
    try {
      await updateDoc(doc(db, "users", user.uid), { settings: newSettings });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "users");
    }
  };

  const handleLanguageChange = async (lang: string) => {
    if (!user) return;
    const newSettings = { ...profileData.settings, language: lang };
    setProfileData({ ...profileData, settings: newSettings });
    try {
      await updateDoc(doc(db, "users", user.uid), { settings: newSettings });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "users");
    }
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
      toast.success("تم حفظ التعديلات بنجاح!");
      setProfileMessage("تم حفظ التعديلات بنجاح!");
      setTimeout(() => setProfileMessage(""), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "users");
      setProfileMessage("حدث خطأ أثناء الحفظ.");
    } finally {
      setProfileSaving(false);
    }
  };

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // ضغط الصورة بجودة 0.7 لتقليل الحجم بشكل كبير
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        // ضغط الصورة قبل حفظها في الحالة
        const compressed = await compressImage(base64);
        setter(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitVerification = async () => {
    if (!user || !idFront) return;
    setVerificationLoading(true);
    setVerificationMessage("");
    try {
      await setDoc(doc(db, "verifications", user.uid), {
        userId: user.uid,
        idFrontUrl: idFront,
        idBackUrl: idBack,
        selfieUrl: selfie,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      await updateDoc(doc(db, "users", user.uid), {
        verificationStatus: "pending"
      });
      toast.success("تم إرسال طلب التوثيق للمراجعة.");
      setVerificationMessage("تم إرسال طلب التوثيق للمراجعة.");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "verifications");
      setVerificationMessage("حدث خطأ أثناء إرسال الطلب.");
    } finally {
      setVerificationLoading(false);
    }
  };

  const tabs = [
    { id: "profile", name: t("nav.profile"), icon: <User size={18} /> },
    { id: "orders", name: t("nav.orders"), icon: <Clock size={18} /> },
    { id: "notifications", name: t("nav.notifications"), icon: <Bell size={18} /> },
    { id: "support", name: t("nav.support"), icon: <MessageSquare size={18} /> },
  ];

  const [tickets, setTickets] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  
  useEffect(() => {
    const el = document.getElementById("chat-messages-container");
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [chatMessages]);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [isSendingTicket, setIsSendingTicket] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

  useEffect(() => {
    if (!user || currentTab !== "support") return;
    const q = query(
      collection(db, "supportTickets"),
      where("userId", "==", user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ts: any[] = [];
      snapshot.forEach(d => ts.push({ id: d.id, ...d.data() }));
      setTickets(ts.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "supportTickets");
    });
    return () => unsubscribe();
  }, [user, currentTab]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "in", ["all", user.uid])
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ns: any[] = [];
      snapshot.forEach(d => ns.push({ id: d.id, ...d.data() }));
      setNotifications(ns.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!selectedTicketId) {
      setChatMessages([]);
      return;
    }
    const q = query(
      collection(db, "supportTickets", selectedTicketId, "messages")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ms: any[] = [];
      snapshot.forEach(d => ms.push({ id: d.id, ...d.data() }));
      setChatMessages(ms.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0)));
    }, (error) => {
      console.error(error);
    });
    return () => unsubscribe();
  }, [selectedTicketId]);

  const handleSendNewTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !ticketSubject || !ticketMessage) return;
    setIsSendingTicket(true);
    try {
      const ticketRef = doc(collection(db, "supportTickets"));
      const ticketId = ticketRef.id;
      
      const userInfo = `
📋 معلومات المستخدم:
👤 الاسم: ${user.displayName || "غير معروف"}
📧 البريد: ${user.email}
🌐 اللغة: ${language}
📱 المتصفح: ${navigator.userAgent.slice(0, 50)}...
      `.trim();

      await setDoc(ticketRef, {
        userId: user.uid,
        userName: user.displayName || "مستخدم",
        subject: ticketSubject,
        lastMessage: ticketMessage,
        userInfo: userInfo,
        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Message 1: User Info (System)
      const systemMsgRef = doc(collection(db, "supportTickets", ticketId, "messages"));
      await setDoc(systemMsgRef, {
        senderId: "system",
        senderName: "النظام",
        text: userInfo,
        createdAt: serverTimestamp(),
        isSystem: true
      });

      // Message 2: User's actual message
      const messageRef = doc(collection(db, "supportTickets", ticketId, "messages"));
      await setDoc(messageRef, {
        senderId: user.uid,
        senderName: user.displayName || "مستخدم",
        text: ticketMessage,
        createdAt: serverTimestamp()
      });

      toast.success(t("common.save"));
      setTicketSubject("");
      setTicketMessage("");
      setIsCreatingTicket(false);
      setSelectedTicketId(ticketId);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "supportTickets");
    } finally {
      setIsSendingTicket(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTicketId || !ticketMessage.trim()) return;
    
    const text = ticketMessage;
    setTicketMessage("");
    try {
      const messageRef = doc(collection(db, "supportTickets", selectedTicketId, "messages"));
      await setDoc(messageRef, {
        senderId: user.uid,
        senderName: user.displayName || "مستخدم",
        text: text,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, "supportTickets", selectedTicketId), {
        lastMessage: text,
        updatedAt: serverTimestamp(),
        status: "open"
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "supportTickets");
    }
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
                  <div className="space-y-16">
                    {/* 1. Personal Information */}
                    <section id="personal-info" className="space-y-4">
                        <div 
                           onClick={() => toggleSection('personal-info')}
                           className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4 cursor-pointer group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 px-2 rounded-xl transition-all"
                        >
                           <h3 className="text-xl font-bold flex items-center gap-2">
                             <User className="text-indigo-500" /> المعلومات الشخصية
                           </h3>
                           <motion.div animate={{ rotate: expandedSections['personal-info'] ? 180 : 0 }}>
                              <ChevronDown size={20} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                           </motion.div>
                        </div>
                        
                        <AnimatePresence>
                          {expandedSections['personal-info'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="flex flex-col md:flex-row gap-8 items-start pt-4 px-2">
                                <div className="relative group shrink-0">
                                  <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-xl overflow-hidden relative">
                                     {user.photoURL ? (
                                       <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                     ) : (
                                       <User size={40} className="text-slate-400" />
                                     )}
                                  </div>
                                  <button className="absolute bottom-0 right-0 p-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition-all shadow-lg active:scale-95">
                                    <Camera size={14} />
                                  </button>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">{profileData.displayName || "مستخدم جديد"}</h2>
                                    {profileData.isVerified && (
                                      <div className="bg-blue-500 text-white p-1 rounded-full shadow-lg shadow-blue-500/20" title="حساب موثق">
                                        <Check size={12} strokeWidth={4} />
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-slate-500 font-en mb-4 flex items-center gap-2">
                                     <span>{profileData.email}</span>
                                     <span className="opacity-30">•</span>
                                     <span className="dir-ltr">{profileData.phoneNumber || "لا يوجد رقم هاتف"}</span>
                                  </p>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">المحافظة</label>
                                      <select name="governorate" value={profileData.governorate} onChange={handleProfileChange} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 transition-all">
                                        <option value="" disabled>اختر المحافظة</option>
                                        {GOVERNORATES.map(gov => (
                                          <option key={gov} value={gov}>{gov}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">تاريخ الميلاد</label>
                                      <input name="birthDate" value={profileData.birthDate} readOnly type="date" className="w-full font-en bg-slate-100 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none text-slate-500 cursor-not-allowed" />
                                    </div>
                                  </div>
                                  
                                  <div className="mt-6 flex justify-end">
                                    <button onClick={handleProfileSave} disabled={profileSaving} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/25 active:scale-95 disabled:opacity-50">
                                      {profileSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                      حفظ التعديلات
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                    </section>

                      {/* 2. Wallet */}
                      <section id="wallet" className="space-y-4">
                        <div 
                           onClick={() => toggleSection('wallet')}
                           className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4 cursor-pointer group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 px-2 rounded-xl transition-all"
                        >
                           <h3 className="text-xl font-bold flex items-center gap-2">
                             <Wallet className="text-indigo-500" /> المحفظة الإلكترونية
                           </h3>
                           <motion.div animate={{ rotate: expandedSections['wallet'] ? 180 : 0 }}>
                              <ChevronDown size={20} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                           </motion.div>
                        </div>
                        
                        <AnimatePresence>
                          {expandedSections['wallet'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden pt-4 px-2"
                            >
                              <div className="overflow-hidden bg-slate-900 border border-slate-800 rounded-[32px] p-6 md:p-8 text-white relative">
                                <div className="relative z-10">
                                  <div className="flex items-center gap-2 text-indigo-400 mb-4">
                                    <Wallet size={20} />
                                    <span className="text-xs font-bold uppercase tracking-widest">محفظتك الرقمية</span>
                                  </div>
                                  <div className="mb-8">
                                    <p className="text-slate-400 text-sm mb-1">الرصيد المتاح</p>
                                    <h2 className="text-4xl md:text-5xl font-black font-en flex items-baseline gap-2">
                                      {profileData.walletBalance?.toLocaleString()}
                                      <span className="text-xl font-normal opacity-40 font-sans">ل.س</span>
                                    </h2>
                                  </div>
                                  <div className="flex flex-col sm:flex-row gap-3">
                                    <button 
                                      onClick={() => setIsDepositModalOpen(true)}
                                      className="flex-1 py-4 bg-indigo-500 hover:bg-indigo-600 rounded-2xl text-sm font-bold transition-all shadow-xl shadow-indigo-500/30 active:scale-95"
                                    >
                                      تغذية الرصيد
                                    </button>
                                    <button 
                                      onClick={() => toast("ميزة التحويل ستتوفر قريباً للعملاء الموثقين.")}
                                      className="flex-1 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl text-sm font-bold transition-all active:scale-95"
                                    >
                                      تحويل رصيد
                                    </button>
                                  </div>
                                </div>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full -mr-20 -mt-20"></div>
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 blur-[80px] rounded-full -ml-20 -mb-20"></div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>

                      {/* 3. Saved Services */}
                      <section id="saved-services" className="space-y-4">
                        <div 
                           onClick={() => toggleSection('saved-services')}
                           className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4 cursor-pointer group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 px-2 rounded-xl transition-all"
                        >
                           <h3 className="text-xl font-bold flex items-center gap-2">
                             <CreditCard className="text-indigo-500" /> الخدمات المحفوظة
                           </h3>
                           <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full text-slate-500 uppercase tracking-widest leading-none">
                                 {savedServices.length} مادة
                              </span>
                              <motion.div animate={{ rotate: expandedSections['saved-services'] ? 180 : 0 }}>
                                 <ChevronDown size={20} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                              </motion.div>
                           </div>
                        </div>
                        
                        <AnimatePresence>
                          {expandedSections['saved-services'] && (
                            <motion.div
                               initial={{ height: 0, opacity: 0 }}
                               animate={{ height: 'auto', opacity: 1 }}
                               exit={{ height: 0, opacity: 0 }}
                               className="overflow-hidden pt-2 px-2"
                            >
                              {savedServices.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-3xl group hover:border-indigo-200 transition-colors">
                                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300 group-hover:text-indigo-300 transition-colors">
                                     <CreditCard size={32} />
                                  </div>
                                  <p className="text-slate-400 font-medium">لا توجد خدمات محفوظة حالياً.</p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                                   {savedServices.map((service) => (
                                     <motion.div 
                                       key={service.id} 
                                       layout
                                       className="p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-3xl hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-none transition-all group"
                                     >
                                        <div className="flex items-center gap-3 mb-4">
                                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${service.iconBgClass || 'bg-slate-100'} ${service.iconTextClass || 'text-slate-500'}`}>
                                              <RefreshCw size={20} />
                                           </div>
                                           <div className="flex-1 truncate">
                                              <h4 className="font-bold text-sm truncate">{service.name}</h4>
                                              <p className="text-[10px] text-slate-500 font-en uppercase tracking-tighter">{service.company}</p>
                                           </div>
                                           <button 
                                              onClick={() => handleDeleteSavedService(service.id)}
                                              className="p-2 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                           >
                                              <Trash2 size={16} />
                                           </button>
                                        </div>
                                        <div className="flex gap-2">
                                           <button 
                                              onClick={() => navigate(`/service/${service.serviceId}?data=${service.id}`)}
                                              className="flex-1 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/10"
                                           >
                                              إعادة شحن
                                           </button>
                                        </div>
                                     </motion.div>
                                   ))}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>

                      {/* 4. Verification Status */}
                      <section id="verification" className="space-y-4">
                         <div 
                            onClick={() => toggleSection('verification')}
                            className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4 cursor-pointer group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 px-2 rounded-xl transition-all"
                         >
                            <h3 className="text-xl font-bold flex items-center gap-2">
                               <Shield className="text-indigo-500" /> التوثيق
                            </h3>
                            <div className="flex items-center gap-3">
                               <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border flex items-center gap-1.5 ${
                                 profileData.verificationStatus === "verified" ? "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" :
                                 profileData.verificationStatus === "pending" ? "bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" :
                                 "bg-slate-50 border-slate-100 text-slate-400 dark:bg-slate-900/50"
                               }`}>
                                  {profileData.verificationStatus === "verified" ? <Check size={10} strokeWidth={4} /> : profileData.verificationStatus === "pending" ? <Clock size={10} strokeWidth={4} /> : null}
                                  {profileData.verificationStatus === "verified" ? "موثق" : profileData.verificationStatus === "pending" ? "قيد المراجعة" : "غير موثق"}
                               </div>
                               <motion.div animate={{ rotate: expandedSections['verification'] ? 180 : 0 }}>
                                  <ChevronDown size={20} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                               </motion.div>
                            </div>
                         </div>
                         
                         <AnimatePresence>
                           {expandedSections['verification'] && (
                             <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden pt-4 px-2"
                             >
                               <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700">
                                  {profileData.verificationStatus === "verified" ? (
                                    <div className="flex gap-4">
                                       <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center shrink-0">
                                          <Shield size={24} />
                                       </div>
                                       <div>
                                          <h4 className="font-bold text-slate-800 dark:text-white mb-1">حسابك موثق بالكامل</h4>
                                          <p className="text-xs text-slate-500 leading-relaxed max-w-lg">
                                             شكراً لتوثيق هويتك. يمكنك الآن الاستمتاع بكافة الميزات والحماية الإضافية لحسابك، بما في ذلك ميزات التحويل المالي وسقوف شحن أعلى.
                                          </p>
                                       </div>
                                    </div>
                                  ) : profileData.verificationStatus === "pending" ? (
                                     <div className="flex gap-4">
                                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center shrink-0">
                                           <Clock size={24} />
                                        </div>
                                        <div>
                                           <h4 className="font-bold text-slate-800 dark:text-white mb-1">طلب التوثيق قيد المراجعة</h4>
                                           <p className="text-xs text-slate-500 leading-relaxed max-w-lg">
                                              نحن نقوم الآن بمراجعة مستنداتك الثبوتية التي قمت برفعها. ستتم العملية خلال 24 ساعة عمل، وسيصلك إشعار بالنتيجة.
                                           </p>
                                        </div>
                                     </div>
                                  ) : (
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                       <div className="space-y-1">
                                          <h4 className="font-bold text-slate-800 dark:text-white">توثيق الهوية</h4>
                                          <p className="text-xs text-slate-500 max-w-md">قم برفع صور مستنداتك الرسمية لتوثيق حسابك وزيادة الأمان والحصول على صلاحيات الوكلاء.</p>
                                       </div>
                                       <button 
                                          onClick={() => navigate("/dashboard?tab=verification_form")}
                                          className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 hover:bg-indigo-100 px-6 py-3 rounded-2xl font-bold text-sm transition-all"
                                       >
                                          ابدأ التوثيق الآن
                                       </button>
                                    </div>
                                  )}
                               </div>
                             </motion.div>
                           )}
                         </AnimatePresence>
                      </section>

                      {/* 5. Change Password */}
                      <section id="change-password" className="space-y-4">
                         <div 
                            onClick={() => toggleSection('change-password')}
                            className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4 cursor-pointer group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 px-2 rounded-xl transition-all"
                         >
                            <h3 className="text-xl font-bold flex items-center gap-2">
                               <Lock className="text-indigo-500" /> تغيير كلمة المرور
                            </h3>
                            <motion.div animate={{ rotate: expandedSections['change-password'] ? 180 : 0 }}>
                               <ChevronDown size={20} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                            </motion.div>
                         </div>
                         
                         <AnimatePresence>
                           {expandedSections['change-password'] && (
                             <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden pt-4 px-2"
                             >
                               <form onSubmit={handleUpdatePassword} className="bg-slate-50 dark:bg-slate-900/40 p-6 md:p-8 rounded-[32px] border border-slate-100 dark:border-slate-700 space-y-6">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                     <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">كلمة المرور الحالية</label>
                                        <div className="relative">
                                           <input 
                                             type={showPasswords.current ? "text" : "password"} 
                                             required
                                             value={passwordState.currentPassword}
                                             onChange={(e) => setPasswordState({...passwordState, currentPassword: e.target.value})}
                                             className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 h-14 outline-none focus:border-indigo-500 transition-all font-en"
                                             placeholder="••••••••••••"
                                           />
                                           <button 
                                             type="button" 
                                             onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                                             className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
                                           >
                                              {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                                           </button>
                                        </div>
                                     </div>
                                     <div className="hidden md:block"></div>
                                     
                                     <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">كلمة المرور الجديدة</label>
                                        <div className="relative">
                                           <input 
                                             type={showPasswords.new ? "text" : "password"} 
                                             required
                                             value={passwordState.newPassword}
                                             onChange={(e) => setPasswordState({...passwordState, newPassword: e.target.value})}
                                             className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 h-14 outline-none focus:border-indigo-500 transition-all font-en"
                                             placeholder="••••••••••••"
                                           />
                                           <button 
                                             type="button" 
                                             onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                                             className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
                                           >
                                              {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                           </button>
                                        </div>
                                     </div>
                                     <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">تأكيد كلمة المرور الجديدة</label>
                                        <div className="relative">
                                           <input 
                                             type={showPasswords.confirm ? "text" : "password"} 
                                             required
                                             value={passwordState.confirmPassword}
                                             onChange={(e) => setPasswordState({...passwordState, confirmPassword: e.target.value})}
                                             className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 h-14 outline-none focus:border-indigo-500 transition-all font-en"
                                             placeholder="••••••••••••"
                                           />
                                           <button 
                                             type="button" 
                                             onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                                             className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
                                           >
                                              {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                           </button>
                                        </div>
                                     </div>
                                  </div>
                                  
                                  <div className="flex justify-end pt-2">
                                     <button 
                                       type="submit" 
                                       disabled={isChangingPassword}
                                       className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-10 py-4 rounded-2xl font-bold transition-all shadow-xl hover:shadow-indigo-500/10 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                     >
                                        {isChangingPassword ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                                        تحديث كلمة المرور
                                     </button>
                                  </div>
                               </form>
                             </motion.div>
                           )}
                         </AnimatePresence>
                      </section>

                      {/* 6. Site Settings */}
                      <section id="site-settings" className="space-y-4">
                         <div 
                            onClick={() => toggleSection('site-settings')}
                            className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4 cursor-pointer group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 px-2 rounded-xl transition-all"
                         >
                            <h3 className="text-xl font-bold flex items-center gap-2">
                               <Settings className="text-indigo-500" /> إعدادات الموقع
                            </h3>
                            <motion.div animate={{ rotate: expandedSections['site-settings'] ? 180 : 0 }}>
                               <ChevronDown size={20} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                            </motion.div>
                         </div>
                         
                         <AnimatePresence>
                           {expandedSections['site-settings'] && (
                             <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden pt-4 px-2"
                             >
                               <div className="bg-slate-50 dark:bg-slate-900/40 p-6 md:p-8 rounded-[32px] border border-slate-100 dark:border-slate-700 divide-y divide-slate-200/50 dark:divide-slate-700/50">
                                  <div className="py-5 flex items-center justify-between first:pt-0">
                                     <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 shadow-sm">
                                           {profileData.settings?.darkMode ? <Moon size={22} /> : <Sun size={22} />}
                                        </div>
                                        <div>
                                           <h4 className="font-bold text-sm">الوضع الليلي</h4>
                                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">تبديل بين المظهر الفاتح والداكن</p>
                                        </div>
                                     </div>
                                     <button 
                                       onClick={() => toggleSetting('darkMode')}
                                       className={`w-14 h-7 rounded-full transition-all relative ${profileData.settings?.darkMode ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                     >
                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${profileData.settings?.darkMode ? 'left-1 shadow-md' : 'left-8'}`}></div>
                                     </button>
                                  </div>

                                  <div className="py-5 flex items-center justify-between">
                                     <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 shadow-sm">
                                           <Smartphone size={22} />
                                        </div>
                                        <div>
                                           <h4 className="font-bold text-sm">حفظ بياناتي تلقائياً</h4>
                                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">تعبئة الحقول ببياناتك السابقة تلقائياً</p>
                                        </div>
                                     </div>
                                     <button 
                                       onClick={() => toggleSetting('autoSave')}
                                       className={`w-14 h-7 rounded-full transition-all relative ${profileData.settings?.autoSave ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                     >
                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${profileData.settings?.autoSave ? 'left-1 shadow-md' : 'left-8'}`}></div>
                                     </button>
                                  </div>

                                  <div className="py-5 flex items-center justify-between">
                                     <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 shadow-sm">
                                           <Globe size={22} />
                                        </div>
                                        <div>
                                           <h4 className="font-bold text-sm">لغة الموقع</h4>
                                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">تغيير لغة العرض والواجهة</p>
                                        </div>
                                     </div>
                                     <select 
                                       value={profileData.settings?.language || "ar"}
                                       onChange={(e) => handleLanguageChange(e.target.value)}
                                       className="bg-transparent font-bold text-xs outline-none text-indigo-500 pb-1"
                                     >
                                        <option value="ar">العربية (SY)</option>
                                        <option value="en">English (US)</option>
                                     </select>
                                  </div>

                                  <div className="py-5 flex items-center justify-between last:pb-0">
                                     <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 shadow-sm">
                                           <Bell size={22} />
                                        </div>
                                        <div>
                                           <h4 className="font-bold text-sm">الإشعارات</h4>
                                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">تلقي تنبيهات عند نجاح/فشل العمليات</p>
                                        </div>
                                     </div>
                                     <button 
                                       onClick={() => toggleSetting('notifications')}
                                       className={`w-14 h-7 rounded-full transition-all relative ${profileData.settings?.notifications ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                     >
                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${profileData.settings?.notifications ? 'left-1 shadow-md' : 'left-8'}`}></div>
                                     </button>
                                  </div>
                               </div>
                             </motion.div>
                           )}
                         </AnimatePresence>
                      </section>
                    </div>
                )}


                {currentTab === "verification_form" && (
                  <div className="space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold mb-1 items-center flex gap-2">
                          <Shield className="text-indigo-500" /> توثيق الهوية
                        </h2>
                        <p className="text-slate-500">قم بتوثيق حسابك للوصول إلى ميزات إضافية وضمان الأمان.</p>
                      </div>
                      <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 font-bold ${
                        profileData.verificationStatus === "verified" ? "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400" :
                        profileData.verificationStatus === "pending" ? "bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400" :
                        profileData.verificationStatus === "rejected" ? "bg-red-50 border-red-100 text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400" :
                        "bg-slate-50 border-slate-100 text-slate-500 dark:bg-slate-700/50 dark:border-slate-700 dark:text-slate-400"
                      }`}>
                         {profileData.verificationStatus === "verified" ? <Check size={18} /> : 
                          profileData.verificationStatus === "pending" ? <Clock size={18} /> : 
                          profileData.verificationStatus === "rejected" ? <AlertCircle size={18} /> : null}
                         {profileData.verificationStatus === "verified" ? "تم التوثيق" : 
                          profileData.verificationStatus === "pending" ? "قيد المراجعة" : 
                          profileData.verificationStatus === "rejected" ? "مرفوض" : "غير موثق"}
                      </div>
                    </div>

                    {profileData.verificationStatus === "none" || profileData.verificationStatus === "rejected" ? (
                      <div className="space-y-6">
                        {profileData.verificationStatus === "rejected" && verificationData?.adminComment && (
                          <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl flex items-start gap-4">
                            <AlertCircle className="text-red-500 shrink-0 mt-1" size={20} />
                            <div>
                               <p className="font-bold text-red-700 dark:text-red-400 mb-1">سبب الرفض:</p>
                               <p className="text-sm text-red-600 dark:text-red-300">{verificationData.adminComment}</p>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* ID Front */}
                          <div className="space-y-3">
                            <p className="font-bold text-sm">صورة الهوية وجه (أمامي)</p>
                            <label className={`block aspect-[3/2] border-2 border-dashed rounded-3xl cursor-pointer transition-all overflow-hidden relative group ${
                              idFront ? "border-indigo-500" : "border-slate-200 dark:border-slate-700 hover:border-indigo-500"
                            }`}>
                              {idFront ? (
                                <img src={idFront} alt="ID Front" className="w-full h-full object-cover" />
                              ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 group-hover:text-indigo-500">
                                  <FileImage size={32} className="mb-2" />
                                  <span className="text-xs font-bold">رفع صورة</span>
                                </div>
                              )}
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, setIdFront)} />
                            </label>
                          </div>

                          {/* ID Back */}
                          <div className="space-y-3">
                            <p className="font-bold text-sm">صورة الهوية خلف (خلفي)</p>
                            <label className={`block aspect-[3/2] border-2 border-dashed rounded-3xl cursor-pointer transition-all overflow-hidden relative group ${
                              idBack ? "border-indigo-500" : "border-slate-200 dark:border-slate-700 hover:border-indigo-500"
                            }`}>
                              {idBack ? (
                                <img src={idBack} alt="ID Back" className="w-full h-full object-cover" />
                              ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 group-hover:text-indigo-500">
                                  <FileImage size={32} className="mb-2" />
                                  <span className="text-xs font-bold">رفع صورة</span>
                                </div>
                              )}
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, setIdBack)} />
                            </label>
                          </div>

                          {/* Selfie */}
                          <div className="space-y-3">
                            <p className="font-bold text-sm">سلفي مع الهوية</p>
                            <label className={`block aspect-[3/2] border-2 border-dashed rounded-3xl cursor-pointer transition-all overflow-hidden relative group ${
                              selfie ? "border-indigo-500" : "border-slate-200 dark:border-slate-700 hover:border-indigo-500"
                            }`}>
                              {selfie ? (
                                <img src={selfie} alt="Selfie" className="w-full h-full object-cover" />
                              ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 group-hover:text-indigo-500">
                                  <Camera size={32} className="mb-2" />
                                  <span className="text-xs font-bold">التقاط / رفع صورة</span>
                                </div>
                              )}
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, setSelfie)} />
                            </label>
                          </div>
                        </div>

                        <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl flex items-start gap-4">
                           <AlertCircle className="text-indigo-500 shrink-0 mt-1" size={20} />
                           <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                             يرجى التأكد من أن جميع الصور واضحة، وأن ضوء الغرفة مناسب، وبأن جميع حواف بطاقة الهوية ظاهرة في الإطار. سيتم معالجة طلبك خلال 24-48 ساعة عمل.
                           </p>
                        </div>

                        <div className="flex items-center justify-between pt-4">
                           <p className={`text-sm font-bold ${verificationMessage.includes("نجاح") || verificationMessage.includes("تم") ? 'text-emerald-500' : 'text-red-500'}`}>
                              {verificationMessage}
                           </p>
                           <button 
                             onClick={submitVerification}
                             disabled={verificationLoading || !idFront}
                             className="bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                           >
                              {verificationLoading ? <Loader2 className="animate-spin" size={20} /> : <Shield size={20} />}
                              ارسال للتوثيق
                           </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-xl ${
                          profileData.verificationStatus === "verified" ? "bg-emerald-500 text-white" : "bg-amber-100 text-amber-500"
                        }`}>
                           {profileData.verificationStatus === "verified" ? <Check size={40} /> : <Clock size={40} />}
                        </div>
                        <h3 className="text-xl font-bold mb-2">
                           {profileData.verificationStatus === "verified" ? "حسابك موثق بالكامل" : "طلبك قيد المراجعة"}
                        </h3>
                        <p className="text-slate-500 max-w-sm">
                           {profileData.verificationStatus === "verified" ? "شكراً لتوثيق هويتك. يمكنك الآن الاستمتاع بكافة الميزات والحماية الإضافية لحسابك." : "نحن نقوم الآن بمراجعة مستنداتك الثبوتية. سيتم إخطارك فور انتهاء العملية."}
                        </p>
                        
                        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
                           <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 text-right">
                              <p className="text-[10px] text-slate-500 mb-1">رقم الطلب</p>
                              <p className="font-en text-sm font-bold tracking-wider">{user.uid.substring(0, 10).toUpperCase()}</p>
                           </div>
                           <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 text-right">
                              <p className="text-[10px] text-slate-500 mb-1">آخر تحديث</p>
                              <p className="text-sm font-bold">{new Date(verificationData?.updatedAt?.toMillis() || Date.now()).toLocaleDateString('ar-SY')}</p>
                           </div>
                        </div>
                      </div>
                    )}
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
                                <div className="flex flex-wrap gap-3 text-sm text-slate-500 items-center">
                                 <span className="flex items-center gap-1 font-medium">{tx.company}</span>
                                 <span>•</span>
                                 <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                                   <span className="font-en text-[10px] tracking-wider">{tx.id.toUpperCase()}</span>
                                   <button 
                                      onClick={() => copyToClipboard(tx.id)}
                                      className="p-1 hover:text-indigo-500 transition-colors"
                                   >
                                     {copiedId === tx.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                   </button>
                                 </div>
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
                            onClick={() => setIsDepositModalOpen(true)}
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

                    <AnimatePresence>
                      {isDepositModalOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isDepositing && setIsDepositModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
                           <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-xl bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl p-8 md:p-10 max-h-[90vh] overflow-y-auto">
                              <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-indigo-500/20">
                                   <Wallet size={32} />
                                </div>
                                <h3 className="text-2xl font-bold">شحن الرصيد</h3>
                                <p className="text-slate-500 mt-2 text-sm">اختر طريقة الدفع وقم برفع صورة إشعار التحويل</p>
                              </div>

                              <form onSubmit={handleDepositSubmit} className="space-y-6">
                                 <div className="space-y-3">
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">اختر طريقة الدفع</label>
                                    <div className="grid grid-cols-2 gap-3">
                                       {depositMethods.map(m => (
                                         <button 
                                           key={m.id} 
                                           type="button"
                                           onClick={() => setSelectedMethod(m)}
                                           className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                                             selectedMethod?.id === m.id ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500" : "border-slate-100 dark:border-slate-700 hover:border-indigo-200"
                                           }`}
                                         >
                                            <CreditCard size={20} />
                                            <span className="text-xs font-bold">{m.name}</span>
                                         </button>
                                       ))}
                                    </div>
                                 </div>

                                 {selectedMethod && (
                                   <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-4">
                                      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm">
                                         <div>
                                            <p className="text-[10px] text-slate-500 mb-1">الرقم / الرمز</p>
                                            <p className="font-bold font-en text-indigo-500 text-lg tracking-wider">{selectedMethod.code}</p>
                                         </div>
                                         <button 
                                            type="button"
                                            onClick={() => copyToClipboard(selectedMethod.code)} 
                                            className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 rounded-xl hover:bg-indigo-100 transition-colors"
                                         >
                                            {copiedId === selectedMethod.code ? <Check size={18} /> : <Copy size={18} />}
                                         </button>
                                      </div>
                                      {selectedMethod.note && <p className="text-xs text-slate-500 italic bg-amber-50 dark:bg-amber-500/5 p-3 rounded-xl border border-amber-100/50 dark:border-amber-500/10">{selectedMethod.note}</p>}
                                      {selectedMethod.qrCodeUrl && <img src={selectedMethod.qrCodeUrl} className="w-32 h-32 mx-auto rounded-xl shadow-sm bg-white p-2" alt="QR" />}
                                   </motion.div>
                                 )}

                                 <div className="space-y-2">
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">المبلغ المطلوب شحنه (ل.س)</label>
                                    <input 
                                      type="number" 
                                      required
                                      value={depositAmount}
                                      onChange={(e) => setDepositAmount(e.target.value)}
                                      placeholder="مثال: 50,000"
                                      className="w-full h-14 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 outline-none focus:border-indigo-500 transition-all font-en font-bold"
                                    />
                                 </div>

                                 <div className="space-y-2">
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">صورة إشعار الدفع</label>
                                    <label className={`block w-full border-2 border-dashed rounded-3xl cursor-pointer transition-all overflow-hidden relative group ${
                                      depositProof ? "border-indigo-500" : "border-slate-200 dark:border-slate-700 hover:border-indigo-500"
                                    }`}>
                                      {depositProof ? (
                                        <div className="h-48 relative">
                                          <img src={depositProof} alt="Proof" className="w-full h-full object-contain p-2" />
                                          <button type="button" onClick={(e) => { e.preventDefault(); setDepositProof(null); }} className="absolute top-2 left-2 p-2 bg-red-500 text-white rounded-full">
                                            <X size={16} />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="h-32 flex flex-col items-center justify-center text-slate-400 group-hover:text-indigo-500">
                                          <FileImage size={32} className="mb-2" />
                                          <span className="text-xs font-bold text-center">انقر لرفع صورة إشعار التحويل</span>
                                        </div>
                                      )}
                                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, setDepositProof)} />
                                    </label>
                                 </div>

                                 <div className="flex gap-4 pt-4">
                                    <button 
                                      type="submit" 
                                      disabled={isDepositing || !selectedMethod || !depositAmount || !depositProof}
                                      className="flex-[2] bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold py-4 rounded-3xl transition-all shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
                                    >
                                       {isDepositing ? <Loader2 className="animate-spin mx-auto" /> : "إرسال طلب الشحن"}
                                    </button>
                                    <button type="button" onClick={() => setIsDepositModalOpen(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-3xl transition-all active:scale-95">إلغاء</button>
                                 </div>
                              </form>
                           </motion.div>
                        </div>
                      )}
                    </AnimatePresence>
                    
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
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
                      <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Bell className="text-indigo-500" /> {t("nav.notifications")}
                      </h2>
                    </div>
                    
                    <div className="space-y-4">
                      {notifications.length === 0 ? (
                        <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/40 rounded-[32px] border border-slate-100 dark:border-slate-700">
                          <Bell className="mx-auto w-12 h-12 text-slate-200 mb-4" />
                          <p className="text-slate-400">لا توجد إشعارات حالياً.</p>
                        </div>
                      ) : (
                        notifications.map((notif: any) => (
                          <div key={notif.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                            {!notif.read && <div className="absolute top-0 right-0 w-1.5 h-full bg-indigo-500"></div>}
                            <h4 className="font-bold text-slate-800 dark:text-white mb-1 group-hover:text-indigo-500 transition-colors uppercase tracking-tight">{notif.title}</h4>
                            <p className="text-sm text-slate-500 leading-relaxed">{notif.body}</p>
                            <p className="text-[10px] text-slate-400 mt-4 font-en">{new Date(notif.createdAt?.toMillis()).toLocaleString('ar-SY')}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {currentTab === "support" && (
                  <div className="h-full flex flex-col -m-6 md:-m-8">
                    {!selectedTicketId && !isCreatingTicket ? (
                      <div className="flex-1 flex flex-col p-6 md:p-8">
                        <div className="flex items-center justify-between mb-8">
                          <div>
                            <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
                              <MessageSquare className="text-indigo-500" /> {t("dashboard.support")}
                            </h2>
                            <p className="text-slate-500">{language === 'ar' ? 'تواصل مع فريق الدعم الفني لحل مشكلاتك.' : 'Contact support to solve your issues.'}</p>
                          </div>
                          <button 
                            onClick={() => setIsCreatingTicket(true)}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all text-sm flex items-center gap-2"
                          >
                            <Plus size={20} />
                            {t("dashboard.newTicket")}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {tickets.map(ticket => (
                            <button
                              key={ticket.id}
                              onClick={() => setSelectedTicketId(ticket.id)}
                              className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 hover:border-indigo-500 transition-all text-right group"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <h4 className="font-bold text-slate-800 dark:text-white group-hover:text-indigo-500 transition-colors">{ticket.subject}</h4>
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                  ticket.status === 'open' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                                }`}>
                                  {ticket.status === 'open' ? t("dashboard.open") : t("dashboard.replied")}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 line-clamp-2 mb-3">{ticket.lastMessage || ticket.message}</p>
                              <p className="text-[10px] text-slate-400 font-en">{new Date(ticket.updatedAt?.toMillis() || Date.now()).toLocaleString('ar-SY')}</p>
                            </button>
                          ))}
                          {tickets.length === 0 && (
                            <div className="md:col-span-2 lg:col-span-3 text-center py-20 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-3xl">
                              <MessageSquare className="mx-auto w-16 h-16 text-slate-200 mb-4" />
                              <p className="text-slate-400">{language === 'ar' ? 'لا توجد محادثات سابقة.' : 'No previous conversations.'}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : isCreatingTicket ? (
                      <div className="flex-1 p-6 md:p-8">
                        <div className="max-w-2xl mx-auto space-y-8">
                          <div className="flex items-center gap-4">
                            <button onClick={() => setIsCreatingTicket(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                              <X size={24} className="text-slate-500" />
                            </button>
                            <h2 className="text-2xl font-bold">{t("dashboard.newTicket")}</h2>
                          </div>

                          <form onSubmit={handleSendNewTicket} className="space-y-6 bg-slate-50 dark:bg-slate-900/40 p-8 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="space-y-2">
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t("dashboard.subject")}</label>
                              <input 
                                value={ticketSubject} 
                                onChange={e => setTicketSubject(e.target.value)} 
                                required
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:border-indigo-500 shadow-sm" 
                                placeholder={language === 'ar' ? 'ما هو موضوع استفسارك؟' : 'What is your query about?'}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{t("dashboard.message")}</label>
                              <textarea 
                                value={ticketMessage} 
                                onChange={e => setTicketMessage(e.target.value)} 
                                required
                                rows={6}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 outline-none focus:border-indigo-500 shadow-sm" 
                                placeholder={language === 'ar' ? 'اكتب رسالتك بالتفصيل...' : 'Type your message in detail...'}
                              />
                            </div>
                            <button 
                              type="submit" 
                              disabled={isSendingTicket}
                              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
                            >
                              {isSendingTicket ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />}
                              {t("dashboard.send")}
                            </button>
                          </form>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col h-[600px] bg-slate-50 dark:bg-slate-900/20 rounded-2xl">
                         {/* Chat Header */}
                         <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between rounded-t-2xl">
                            <div className="flex items-center gap-4">
                               <button onClick={() => setSelectedTicketId(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                  <X size={20} className="text-slate-500" />
                               </button>
                               <div>
                                  <h3 className="font-bold text-slate-900 dark:text-white">
                                    {tickets.find(t => t.id === selectedTicketId)?.subject}
                                  </h3>
                                  <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none mt-1">مركز الدعم والمساعدة</p>
                               </div>
                            </div>
                         </div>

                         {/* Chat Messages */}
                         <div id="chat-messages-container" className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scroll-smooth">
                            {chatMessages.map((msg, idx) => {
                              const isMe = msg.senderId === user.uid;
                              return (
                                <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${msg.isSystem ? 'hidden' : ''}`}>
                                  {!isMe && (
                                    <span className="text-[10px] text-slate-500 font-bold mb-1 ml-1">{msg.senderName || "المشرف"}</span>
                                  )}
                                  <div className={`max-w-[80%] md:max-w-[70%] p-3.5 rounded-2xl shadow-sm text-sm relative ${
                                    isMe 
                                      ? 'bg-indigo-500 text-white rounded-tr-none' 
                                      : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-tl-none'
                                  }`}>
                                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                    <p className={`text-[9px] mt-2 opacity-60 ${isMe ? 'text-right' : 'text-left'}`}>
                                      {new Date(msg.createdAt?.toMillis() || Date.now()).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    {/* Tail effect */}
                                    <div className={`absolute top-0 w-3 h-3 ${
                                      isMe 
                                        ? '-right-1.5 bg-indigo-500' 
                                        : '-left-1.5 bg-white dark:bg-slate-800 border-t border-l border-slate-100 dark:border-slate-700'
                                    } rotate-45 -z-10`}></div>
                                  </div>
                                </div>
                              );
                            })}
                            <div id="chat-end"></div>
                         </div>

                         {/* Chat Input */}
                         <form onSubmit={handleSendMessage} className="p-4 md:p-6 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 rounded-b-2xl">
                            <div className="flex gap-3">
                               <input 
                                 value={ticketMessage}
                                 onChange={e => setTicketMessage(e.target.value)}
                                 placeholder={language === 'ar' ? 'اكتب رسالتك هنا...' : 'Type your message...'}
                                 className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3.5 outline-none focus:border-indigo-500 transition-all text-sm"
                               />
                               <button 
                                 type="submit"
                                 disabled={!ticketMessage.trim()}
                                 className="w-14 h-14 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-indigo-500/20 active:scale-90 disabled:opacity-50 disabled:scale-100"
                               >
                                 <Send size={24} />
                               </button>
                            </div>
                         </form>
                      </div>
                    )}
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
