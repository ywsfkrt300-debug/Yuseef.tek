import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, CreditCard, Activity, ArrowUpRight, MoreVertical, CheckCircle, XCircle } from "lucide-react";
import { collection, query, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";

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

  return (
    <div className="space-y-6">
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

      {/* Recent Orders */}
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
    </div>
  );
}
