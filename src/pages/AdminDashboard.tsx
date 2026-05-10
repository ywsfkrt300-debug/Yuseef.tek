import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Users, CreditCard, Activity, ArrowUpRight, MoreVertical, CheckCircle, XCircle, MessageSquare, Send, X, Loader2, Bell, Download } from "lucide-react";
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp, setDoc, getDocs } from "firebase/firestore";
import { db, handleFirestoreError, OperationType, auth } from "../lib/firebase";
import { toast } from "react-hot-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export function AdminDashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "transactions"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs: any[] = [];
      let revenue = 0;
      snapshot.forEach(d => {
        const docData = d.data();
        txs.push({id: d.id, ...docData});
        if (docData.amount && docData.status === "مكتمل") revenue += docData.amount;
      });
      txs.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setTransactions(txs);
      setTotalRevenue(revenue);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "transactions");
    });

    return () => unsubscribe();
  }, []);

  const [mostRequested, setMostRequested] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  
  useEffect(() => {
    const el = document.getElementById("admin-chat-container");
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [chatMessages]);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState<string | null>(null);

  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationBody, setNotificationBody] = useState("");
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationTitle || !notificationBody) return;
    setIsSendingNotif(true);
    try {
      await setDoc(doc(collection(db, "notifications")), {
        title: notificationTitle,
        body: notificationBody,
        userId: "all",
        createdAt: serverTimestamp(),
        read: false
      });
      toast.success("تم إرسال الإشعار بنجاح");
      setNotificationTitle("");
      setNotificationBody("");
    } catch (error) {
      toast.error("فشل إرسال الإشعار");
    } finally {
      setIsSendingNotif(false);
    }
  };

  useEffect(() => {
    // Calculate most requested services
    const serviceCounts: Record<string, { count: number, name: string }> = {};
    transactions.forEach(tx => {
      if (tx.serviceName) {
        if (!serviceCounts[tx.serviceName]) {
          serviceCounts[tx.serviceName] = { count: 0, name: tx.serviceName };
        }
        serviceCounts[tx.serviceName].count++;
      }
    });
    const sorted = Object.values(serviceCounts).sort((a, b) => b.count - a.count);
    setMostRequested(sorted);
  }, [transactions]);

  useEffect(() => {
    const q = query(collection(db, "supportTickets"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ts: any[] = [];
      snapshot.forEach(d => ts.push({ id: d.id, ...d.data() }));
      setSupportTickets(ts.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0)));
    }, (error) => {
      console.error(error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedTicketId) {
      setChatMessages([]);
      return;
    }
    const q = query(collection(db, "supportTickets", selectedTicketId, "messages"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ms: any[] = [];
      snapshot.forEach(d => ms.push({ id: d.id, ...d.data() }));
      setChatMessages(ms.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0)));
    }, (error) => {
      console.error(error);
    });
    return () => unsubscribe();
  }, [selectedTicketId]);

  const handleReplyStatus = async (ticketId: string) => {
    const text = replyText[ticketId];
    if (!text || !auth.currentUser) return;
    setSendingReply(ticketId);
    try {
      const messageRef = doc(collection(db, "supportTickets", ticketId, "messages"));
      await setDoc(messageRef, {
        senderId: auth.currentUser.uid,
        senderName: "المشرف",
        text: text,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, "supportTickets", ticketId), {
        lastMessage: text,
        status: "replied",
        updatedAt: serverTimestamp()
      });
      toast.success("تم إرسال الرد");
      setReplyText(prev => ({ ...prev, [ticketId]: "" }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "supportTickets");
    } finally {
      setSendingReply(null);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setLoadingAction(id);
    setDropdownOpen(null);
    try {
      await updateDoc(doc(db, "transactions", id), {
        status: newStatus
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "transactions");
    } finally {
      setLoadingAction(null);
    }
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);
  const [pdfData, setPdfData] = useState<any>(null);

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    const toastId = toast.loading("جاري تجميع البيانات وتوليد التقرير...");
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const servicesSnap = await getDocs(collection(db, "services"));
      const depositsSnap = await getDocs(collection(db, "deposits"));
      
      const totalUsers = usersSnap.size;
      const totalServices = servicesSnap.size;
      const totalDepositsCount = depositsSnap.size;

      const currentDate = new Date().toLocaleDateString("ar-SY");
      
      setPdfData({
        totalUsers,
        totalServices,
        totalTransactions: transactions.length,
        totalRevenue: totalRevenue,
        totalDepositsCount,
        reportDate: currentDate,
        mostRequested: mostRequested.slice(0, 5)
      });

      setTimeout(async () => {
        if (!pdfRef.current) return;
        try {
          const canvas = await html2canvas(pdfRef.current, { scale: 2, useCORS: true });
          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF("p", "mm", "a4");
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          
          pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
          pdf.save(`تقرير-إحصائيات-المنصة-${currentDate}.pdf`);
          toast.success("تم تحميل التقرير بنجاح", { id: toastId });
        } catch (err) {
          console.error(err);
          toast.error("حدث خطأ أثناء توليد التقرير", { id: toastId });
        } finally {
          setIsGeneratingPDF(false);
          setPdfData(null);
        }
      }, 800);

    } catch (error) {
      console.error(error);
      toast.error("فشل في جلب البيانات", { id: toastId });
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">نظرة عامة على النظام</h2>
          <p className="text-sm text-slate-500">إحصائيات المنصة الشاملة</p>
        </div>
        <button
          onClick={generatePDF}
          disabled={isGeneratingPDF}
          className="bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold shadow-md transition-all whitespace-nowrap disabled:opacity-50"
        >
          {isGeneratingPDF ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          {isGeneratingPDF ? "جاري التحميل..." : "تحميل التقرير الشامل (PDF)"}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
          <div>
            <p className="text-slate-500 dark:text-slate-400 mb-1 font-medium">إجمالي الإيرادات</p>
            <h3 className="text-3xl font-bold font-en text-slate-800 dark:text-white">{totalRevenue.toLocaleString()} <span className="text-sm font-sans text-slate-500">ل.س</span></h3>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <CreditCard size={28} />
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
          <div>
            <p className="text-slate-500 dark:text-slate-400 mb-1 font-medium">إجمالي الطلبات</p>
            <h3 className="text-3xl font-bold font-en text-slate-800 dark:text-white">{transactions.length}</h3>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Activity size={28} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
          <div>
            <p className="text-slate-500 dark:text-slate-400 mb-1 font-medium">طلبات قيد المعالجة</p>
            <h3 className="text-3xl font-bold font-en text-slate-800 dark:text-white">{transactions.filter(t => t.status !== "مكتمل" && t.status !== "مرفوض").length}</h3>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Users size={28} />
          </div>
        </div>
      </div>

      {/* Analytics & Support */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Most Requested Services */}
        <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 lg:p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">الخدمات الأكثر طلباً</h3>
          <div className="space-y-4">
            {mostRequested.slice(0, 5).map((service, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center font-bold text-xs">
                    {idx + 1}
                  </div>
                  <span className="font-bold text-sm">{service.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">طلب</span>
                  <span className="font-en font-bold text-indigo-500">{service.count}</span>
                </div>
              </div>
            ))}
            {mostRequested.length === 0 && (
              <p className="text-center text-slate-500 py-8 italic">لا توجد بيانات كافية</p>
            )}
          </div>
        </div>

        {/* Support Tickets */}
        <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 lg:p-8 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">تذاكر الدعم الفني</h3>
            {selectedTicketId && (
              <button 
                onClick={() => setSelectedTicketId(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            )}
          </div>
          
          {!selectedTicketId ? (
            <div className="space-y-4 overflow-y-auto pr-2 flex-1">
              {supportTickets.map(ticket => (
                <button 
                  key={ticket.id} 
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className="w-full text-right p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl space-y-3 hover:border-indigo-500 transition-all active:scale-95"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-indigo-500">{ticket.subject}</h4>
                      <p className="text-[10px] text-slate-400">من: {ticket.userName}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                      ticket.status === 'open' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                    }`}>
                      {ticket.status === 'open' ? 'مفتوحة' : 'تم الرد'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">{ticket.lastMessage || ticket.message}</p>
                  <p className="text-[9px] text-slate-400 font-en">{new Date(ticket.updatedAt?.toMillis() || Date.now()).toLocaleString()}</p>
                </button>
              ))}
              {supportTickets.length === 0 && (
                <p className="text-center text-slate-500 py-8 italic">لا توجد تذاكر دعم</p>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full">
              <div id="admin-chat-container" className="flex-1 overflow-y-auto pr-2 space-y-3 mb-4 scroll-smooth">
                {chatMessages.map((msg, idx) => {
                  const isMe = msg.senderName === "المشرف";
                  if (msg.isSystem) {
                    return (
                      <div key={msg.id || idx} className="flex justify-center my-4">
                        <div className="bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-2xl text-[10px] text-slate-500 font-mono whitespace-pre-wrap max-w-[90%]">
                          {msg.text}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && (
                        <span className="text-[10px] text-slate-500 font-bold mb-1 ml-1">{msg.senderName || "المستخدم"}</span>
                      )}
                      <div className={`max-w-[85%] p-3 rounded-2xl text-[13px] shadow-sm ${
                        isMe ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        <p className={`text-[8px] mt-1 opacity-60 ${isMe ? 'text-left' : 'text-right'}`}>
                          {new Date(msg.createdAt?.toMillis() || Date.now()).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 p-1">
                <input 
                  value={replyText[selectedTicketId] || ""} 
                  onChange={e => setReplyText(prev => ({ ...prev, [selectedTicketId]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleReplyStatus(selectedTicketId)}
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-500" 
                  placeholder="اكتب ردك هنا..."
                />
                <button 
                  onClick={() => handleReplyStatus(selectedTicketId)}
                  disabled={sendingReply === selectedTicketId || !replyText[selectedTicketId]}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white p-2.5 rounded-xl transition-all disabled:opacity-50 active:scale-95"
                >
                  {sendingReply === selectedTicketId ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Admin Notifications Center */}
      <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 lg:p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-500 rounded-2xl">
            <Bell size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">مركز الإشعارات</h3>
            <p className="text-xs text-slate-500">أرسل تنبيهات فورية لجميع مستخدمي المنصة</p>
          </div>
        </div>

        <form onSubmit={handleSendNotification} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">عنوان الإشعار</label>
              <input 
                value={notificationTitle}
                onChange={e => setNotificationTitle(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-500" 
                placeholder="مثلاً: تحديث جديد متوفر..."
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">محتوى الإشعار</label>
              <textarea 
                value={notificationBody}
                onChange={e => setNotificationBody(e.target.value)}
                required
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-500" 
                placeholder="اكتب تفاصيل الإشعار هنا..."
              />
            </div>
          </div>
          <div className="flex flex-col justify-end">
            <button 
              type="submit"
              disabled={isSendingNotif}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-4 rounded-2xl transition-all shadow-xl hover:shadow-indigo-500/10 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSendingNotif ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              بث الإشعار للجميع
            </button>
            <p className="text-[10px] text-slate-400 mt-4 text-center italic">سيظهر هذا الإشعار في تبويب "الإشعارات" لدى جميع المستخدمين.</p>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 lg:p-8 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">أحدث الطلبات</h3>
          <Link to="/admin/transactions" className="text-sm font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1">
            عرض الكل
            <ArrowUpRight size={16} />
          </Link>
        </div>
        
        <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4">
          {transactions.slice(0, 10).map((tx) => (
            <div key={tx.id} className={`flex items-center justify-between p-4 rounded-xl border ${tx.status === 'مكتمل' ? 'border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10' : tx.status === 'مرفوض' ? 'border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10' : 'border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10'}`}>
              <div className="flex-1">
                <p className="font-bold text-slate-800 dark:text-white mb-1">{tx.serviceName}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="text-slate-500 py-0.5 px-2 bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-100 dark:border-slate-700">{tx.company}</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 py-0.5 px-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-md font-en">{tx.amount?.toLocaleString()} SP</span>
                </div>
              </div>
              <div className="flex items-center gap-3 relative mr-2">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0 ${
                  tx.status === 'مكتمل' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 
                  tx.status === 'مرفوض' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                }`}>
                  {tx.status}
                </span>
                
                <div className="relative">
                  <button 
                    disabled={loadingAction === tx.id}
                    onClick={() => setDropdownOpen(dropdownOpen === tx.id ? null : tx.id)}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <MoreVertical size={18} />
                  </button>
                  {dropdownOpen === tx.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(null)}></div>
                      <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-2 z-50 overflow-hidden">
                        <button onClick={() => updateStatus(tx.id, "مكتمل")} className="w-full text-right px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                          <CheckCircle size={16} /> قبول وإكمال
                        </button>
                        <button onClick={() => updateStatus(tx.id, "مرفوض")} className="w-full text-right px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 text-red-600 dark:text-red-400 flex items-center gap-2">
                          <XCircle size={16} /> رفض
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="text-center text-slate-500 py-8 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-2xl">
              لا توجد طلبات جديدة
            </div>
          )}
        </div>
      </div>

      {pdfData && (
        <div className="absolute top-[-9999px] left-[-9999px]">
          <div ref={pdfRef} className="bg-white p-12 w-[800px] text-right text-slate-900" dir="rtl" style={{ fontFamily: "Arial, sans-serif" }}>
            <div className="text-center mb-8 border-b pb-6">
              <h1 className="text-3xl font-bold text-slate-800 mb-2">باي مينتس - تقرير المنصة الشامل</h1>
              <p className="text-slate-500">تاريخ التقرير: {pdfData.reportDate}</p>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <p className="text-sm text-slate-500 mb-2">إجمالي المستخدمين</p>
                <div className="text-4xl font-bold text-indigo-600">{pdfData.totalUsers}</div>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <p className="text-sm text-slate-500 mb-2">الخدمات الفعالة</p>
                <div className="text-4xl font-bold text-emerald-600">{pdfData.totalServices}</div>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <p className="text-sm text-slate-500 mb-2">إجمالي عمليات الشحن</p>
                <div className="text-4xl font-bold text-amber-600">{pdfData.totalDepositsCount}</div>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <p className="text-sm text-slate-500 mb-2">إجمالي الطلبات المنفذة</p>
                <div className="text-4xl font-bold text-blue-600">{pdfData.totalTransactions}</div>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4 bg-slate-100 p-3 rounded-lg">المؤشرات المالية</h2>
              <div className="flex justify-between items-center bg-indigo-50 border border-indigo-100 p-6 rounded-2xl">
                <span className="text-lg font-bold text-indigo-900">إجمالي الإيرادات (الطلبات المكتملة)</span>
                <span className="text-3xl font-bold text-indigo-600">{pdfData.totalRevenue.toLocaleString()} ل.س</span>
              </div>
            </div>

            {pdfData.mostRequested.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-4 bg-slate-100 p-3 rounded-lg">الخدمات الأكثر طلباً</h2>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-right">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-6 py-4 font-bold border-b">الترتيب</th>
                        <th className="px-6 py-4 font-bold border-b">اسم الخدمة</th>
                        <th className="px-6 py-4 font-bold border-b text-left">عدد الطلبات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pdfData.mostRequested.map((service: any, index: number) => (
                        <tr key={index} className="bg-white">
                          <td className="px-6 py-4 text-slate-500">{index + 1}</td>
                          <td className="px-6 py-4 font-bold text-slate-800">{service.name}</td>
                          <td className="px-6 py-4 text-indigo-600 font-bold text-left">{service.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            <div className="mt-12 text-center text-xs text-slate-400">
              <p>تم توليد هذا التقرير آلياً من نظام باي مينتس</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
