import { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy, doc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { Search, Filter, CheckCircle, XCircle, Clock, Eye, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "react-hot-toast";

export function AdminTransactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  useEffect(() => {
    const q = query(collection(db, "transactions"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs: any[] = [];
      snapshot.forEach(doc => {
        txs.push({ id: doc.id, ...doc.data() });
      });
      // Sort manually
      txs.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setTransactions(txs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "transactions");
    });
    return () => unsubscribe();
  }, []);

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.serviceName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         tx.userId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || tx.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const updateStatus = async (tx: any, newStatus: string) => {
    try {
      await updateDoc(doc(db, "transactions", tx.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      if (newStatus === "مرفوض" && tx.status !== "مرفوض" && tx.type !== "deposit" && !!tx.amount) {
         await updateDoc(doc(db, "users", tx.userId), {
            walletBalance: increment(tx.amount)
         });
         toast.success("تم التحديث وإرجاع الرصيد للمستخدم");
      } else {
         toast.success("تم تحديث الحالة بنجاح");
      }

      if (selectedTx?.id === tx.id) {
        setSelectedTx({ ...selectedTx, status: newStatus });
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء التحديث");
      console.error(error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "مكتمل":
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><CheckCircle size={12} /> مكتمل</span>;
      case "مرفوض":
        return <span className="px-3 py-1 bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><XCircle size={12} /> مرفوض</span>;
      case "قيد المراجعة":
      case "pending":
        return <span className="px-3 py-1 bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><Clock size={12} /> قيد المراجعة</span>;
      default:
        return <span className="px-3 py-1 bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 rounded-full text-xs font-bold w-fit">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">العمليات المالية</h1>
          <p className="text-slate-500 dark:text-slate-400">إدارة طلبات الدفع ومراجعة الفواتير</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="ابحث برقم المعاملة أو الخدمة..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-12 pl-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div className="flex gap-2 shrink-0 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {["all", "قيد المراجعة", "مكتمل", "مرفوض"].map((status) => (
              <button 
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  filterStatus === status 
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                  : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                }`}
              >
                {status === "all" ? "الكل" : status}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-sm border-b border-slate-100 dark:border-slate-700">
                <th className="p-4 font-medium rounded-tr-xl">الخدمة / المستخدم</th>
                <th className="p-4 font-medium">المبلغ</th>
                <th className="p-4 font-medium">التاريخ</th>
                <th className="p-4 font-medium text-center">الحالة</th>
                <th className="p-4 font-medium rounded-tl-xl text-center">تفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 italic">جاري التحميل...</td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 italic">لا توجد عمليات تطابق البحث.</td>
                </tr>
              ) : filteredTransactions.map((tx) => (
                <tr key={tx.id} className="text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors border-b border-transparent">
                  <td className="p-4">
                    <div className="font-bold">{tx.serviceName}</div>
                    <div className="text-xs text-slate-500 font-en truncate max-w-[200px]">{tx.userId}</div>
                  </td>
                  <td className="p-4 font-bold font-en text-indigo-500">
                    {tx.amount?.toLocaleString()} SP
                  </td>
                  <td className="p-4 text-xs text-slate-500">
                    {tx.createdAt?.toMillis() ? new Date(tx.createdAt.toMillis()).toLocaleString('ar-SY') : "جديد"}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center">
                      {getStatusBadge(tx.status)}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center">
                      <button 
                        onClick={() => setSelectedTx(tx)}
                        className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedTx && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTx(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-xl font-bold">تفاصيل العملية</h3>
                <button onClick={() => setSelectedTx(null)} className="text-slate-400 hover:text-slate-600"><XCircle size={24} /></button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <p className="text-slate-500 mb-1">الخدمة</p>
                    <p className="font-bold">{selectedTx.serviceName}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <p className="text-slate-500 mb-1">الشركة</p>
                    <p className="font-bold">{selectedTx.company}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <p className="text-slate-500 mb-1">المبلغ</p>
                    <p className="font-bold text-indigo-500 font-en">{selectedTx.amount?.toLocaleString()} SP</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <p className="text-slate-500 mb-1">الحالة</p>
                    <div>{getStatusBadge(selectedTx.status)}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-slate-700 dark:text-slate-300">بيانات الطلب</h4>
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl space-y-2">
                    {selectedTx.requestData && Object.entries(selectedTx.requestData).map(([key, value]: [string, any]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-slate-500">{key}:</span>
                        <span className="font-medium font-en">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <button 
                    onClick={() => updateStatus(selectedTx, "مكتمل")}
                    disabled={selectedTx.status === "مكتمل"}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    اعتماد الطلب
                  </button>
                  <button 
                    onClick={() => updateStatus(selectedTx, "مرفوض")}
                    disabled={selectedTx.status === "مرفوض"}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                  >
                    رفض الطلب
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
