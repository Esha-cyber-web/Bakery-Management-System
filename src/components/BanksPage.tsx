import { useState, useMemo } from "react";
import { useApp } from "./AppContext";
import {
  Plus, Edit2, Trash2, Landmark, ArrowUpRight, ArrowDownLeft,
  X, RefreshCw, History, Smartphone, Building2, Wallet
} from "lucide-react";

const toNum = (v: any) => {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return Number(String(v).replace(/[^0-9.-]+/g, "")) || 0;
};

const PAYMENT_SOURCES = [
  { id: 'cash_hand', name: 'Cash in Hand', icon: '💵', type: 'cash' },
  { id: 'easypaisa', name: 'EasyPaisa', icon: '📱', type: 'mobile' },
  { id: 'jazzcash', name: 'JazzCash', icon: '📲', type: 'mobile' },
  { id: 'bank_transfer', name: 'Bank Transfer', icon: '🏦', type: 'bank' },
  { id: 'cheque', name: 'Cheque', icon: '📄', type: 'bank' },
  { id: 'other', name: 'Other', icon: '💼', type: 'other' },
];

export default function BanksPage() {
  const {
    accounts = [],
    accountTransactions = [],
    addBank,
    updateBank,
    deleteBank,
    addAccountTransaction,
    loading,
    refreshData
  } = useApp();

  const banks = useMemo(() => {
    return accounts
      .filter((a: any) => a?.type === "bank" || a?.type === "cash")
      .map(bank => {
        let balance = 0;
        accountTransactions.forEach(tx => {
          if (tx.debitAccountId === bank.id) balance += toNum(tx.amount);
          if (tx.creditAccountId === bank.id) balance -= toNum(tx.amount);
        });
        return { ...bank, calculatedBalance: balance };
      });
  }, [accounts, accountTransactions]);

  const getBankTransactions = (bankId: string) => {
    return accountTransactions
      .filter(tx => tx.debitAccountId === bankId || tx.creditAccountId === bankId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  };

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<"deposit" | "withdraw">("deposit");
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [sourceType, setSourceType] = useState<'account' | 'external'>('external');
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [externalSource, setExternalSource] = useState("cash_hand");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);

  const [formData, setFormData] = useState({
    name: "", description: "", accountNumber: "", balance: "0"
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", accountNumber: "", balance: "0" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const desc = formData.accountNumber
      ? `${formData.description} | AC: ${formData.accountNumber}`
      : formData.description;
    if (editingId) {
      await updateBank(editingId, { name: formData.name, description: desc });
    } else {
      await addBank({ name: formData.name, description: desc, type: "bank", balance: 0 });
    }
    resetForm();
  };

  const openModal = (bank: any, type: "deposit" | "withdraw") => {
    setSelectedBank(bank);
    setTransactionType(type);
    setSourceType('external');
    setSourceAccountId("");
    setExternalSource("cash_hand");
    setAmount("");
    setDescription("");
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setShowModal(true);
  };

  const submitTransaction = async () => {
    if (!selectedBank) return;
    const amt = toNum(amount);
    if (amt <= 0) { alert("Enter a valid amount"); return; }
    if (!description.trim()) { alert("Please enter a description"); return; }

    let sourceName = '';
    if (sourceType === 'external') {
      const source = PAYMENT_SOURCES.find(s => s.id === externalSource);
      sourceName = source ? `${source.icon} ${source.name}` : externalSource;
    } else {
      const sourceBank = banks.find(b => b.id === sourceAccountId);
      sourceName = sourceBank?.name || 'Unknown Account';
      if (!sourceAccountId) { alert("Select source account"); return; }
      if (transactionType === "deposit" && sourceBank && sourceBank.calculatedBalance < amt) {
        alert(`Insufficient balance in ${sourceBank.name}. Available: RS. ${sourceBank.calculatedBalance.toLocaleString()}`);
        return;
      }
      if (transactionType === "withdraw" && selectedBank.calculatedBalance < amt) {
        alert(`Insufficient balance in ${selectedBank.name}. Available: RS. ${selectedBank.calculatedBalance.toLocaleString()}`);
        return;
      }
    }

    const fullDescription = `${description} | Via: ${sourceName}`;

    if (sourceType === 'external') {
      await addAccountTransaction({
        debitAccountId: transactionType === "deposit" ? selectedBank.id : `EXTERNAL_${externalSource.toUpperCase()}`,
        creditAccountId: transactionType === "deposit" ? `EXTERNAL_${externalSource.toUpperCase()}` : selectedBank.id,
        amount: amt,
        date: transactionDate,
        description: fullDescription,
      });
    } else {
      await addAccountTransaction({
        debitAccountId: transactionType === "deposit" ? selectedBank.id : sourceAccountId,
        creditAccountId: transactionType === "deposit" ? sourceAccountId : selectedBank.id,
        amount: amt,
        date: transactionDate,
        description: fullDescription,
      });
    }

    await refreshData?.();
    setShowModal(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await deleteBank(id);
  };

  const handleEdit = (bank: any) => {
    setFormData({
      name: bank.name,
      description: bank.description || '',
      accountNumber: '',
      balance: '0',
    });
    setEditingId(bank.id);
    setShowForm(true);
  };

  if (loading) return <div className="p-20 text-center">Loading…</div>;

  const totalBalance = banks.reduce((sum, b) => sum + b.calculatedBalance, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black italic uppercase">Financial Accounts</h2>
          <p className="text-gray-500 text-sm mt-1">Manage your banks, cash, and digital wallets</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2"
        >
          {showForm ? <><X size={18}/> Cancel</> : <><Plus size={18}/> Add Account</>}
        </button>
      </div>

      {/* Total Balance Summary */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-3xl p-6 text-white">
        <p className="text-blue-200 text-sm font-semibold uppercase tracking-wide">Total Balance</p>
        <p className="text-4xl font-black mt-1">RS. {totalBalance.toLocaleString()}</p>
        <p className="text-blue-200 text-xs mt-2">{banks.length} account{banks.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-3xl shadow border border-blue-100">
          <h3 className="font-black text-lg mb-4">{editingId ? 'Edit Account' : 'Add New Account'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Account Name *</label>
              <input
                type="text" required
                placeholder="e.g. HBL Bank, Cash Counter, EasyPaisa"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Account Number</label>
              <input
                type="text"
                placeholder="e.g. 03XX-XXXXXXX or AC-123456"
                value={formData.accountNumber}
                onChange={e => setFormData({...formData, accountNumber: e.target.value})}
                className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Description</label>
              <input
                type="text"
                placeholder="e.g. Main business account"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold">
                {editingId ? 'Update Account' : 'Create Account'}
              </button>
              <button type="button" onClick={resetForm} className="bg-gray-100 px-8 py-3 rounded-xl font-bold">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bank Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {banks.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-gray-400">
            <Landmark size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-semibold">No accounts yet</p>
            <p className="text-sm">Click "Add Account" to get started</p>
          </div>
        ) : (
          banks.map(bank => {
            const bankTxs = getBankTransactions(bank.id);
            const isShowingHistory = showHistory === bank.id;
            return (
              <div key={bank.id} className="bg-white rounded-3xl shadow border border-gray-100 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-3 rounded-2xl">
                        <Landmark className="text-blue-600" size={24} />
                      </div>
                      <div>
                        <h3 className="font-black text-gray-800">{bank.name}</h3>
                        {bank.description && (
                          <p className="text-xs text-gray-400 mt-0.5">{bank.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(bank)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <Edit2 size={16} className="text-gray-400" />
                      </button>
                      <button onClick={() => handleDelete(bank.id, bank.name)} className="p-2 hover:bg-red-50 rounded-xl transition-colors">
                        <Trash2 size={16} className="text-red-400" />
                      </button>
                    </div>
                  </div>

                  <div className={`rounded-2xl p-4 mb-4 ${bank.calculatedBalance >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Current Balance</p>
                    <p className={`text-3xl font-black mt-1 ${bank.calculatedBalance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      RS. {bank.calculatedBalance.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => openModal(bank, "deposit")} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-2xl font-black flex items-center justify-center gap-2 transition-colors">
                      <ArrowDownLeft size={18}/> IN
                    </button>
                    <button onClick={() => openModal(bank, "withdraw")} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-2xl font-black flex items-center justify-center gap-2 transition-colors">
                      <ArrowUpRight size={18}/> OUT
                    </button>
                  </div>

                  <button
                    onClick={() => setShowHistory(isShowingHistory ? null : bank.id)}
                    className="w-full mt-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <History size={14}/>
                    {isShowingHistory ? 'Hide History' : 'Show History'}
                  </button>
                </div>

                {isShowingHistory && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-3">Recent Transactions</p>
                    {bankTxs.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">No transactions yet</p>
                    ) : (
                      <div className="space-y-2">
                        {bankTxs.map((tx: any) => {
                          const isIn = tx.debitAccountId === bank.id;
                          return (
                            <div key={tx.id} className="bg-white rounded-xl p-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg ${isIn ? 'bg-green-100' : 'bg-red-100'}`}>
                                  {isIn ? <ArrowDownLeft size={12} className="text-green-600"/> : <ArrowUpRight size={12} className="text-red-600"/>}
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-gray-700 truncate max-w-[150px]">{tx.description || 'Transaction'}</p>
                                  <p className="text-[10px] text-gray-400">{tx.date}</p>
                                </div>
                              </div>
                              <span className={`text-sm font-black ${isIn ? 'text-green-600' : 'text-red-600'}`}>
                                {isIn ? '+' : '-'}RS. {toNum(tx.amount).toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ✅ FIXED: Transaction Modal */}
      {showModal && selectedBank && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          {/* ✅ FIX: max-h-[90vh] overflow-y-auto overscroll-contain added */}
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto overscroll-contain">
            {/* ✅ FIX: sticky top-0 z-10 added */}
            <div className={`p-6 rounded-t-3xl sticky top-0 z-10 ${transactionType === 'deposit' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {transactionType === 'deposit'
                    ? <ArrowDownLeft className="text-white" size={24}/>
                    : <ArrowUpRight className="text-white" size={24}/>
                  }
                  <div>
                    <h3 className="font-black text-white text-lg">
                      {transactionType === 'deposit' ? 'Money IN' : 'Money OUT'}
                    </h3>
                    <p className="text-white/80 text-sm">{selectedBank.name}</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white">
                  <X size={24}/>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-2xl p-4 text-center">
                <p className="text-xs text-gray-500 uppercase font-semibold">Current Balance</p>
                <p className="text-2xl font-black text-gray-800">RS. {selectedBank.calculatedBalance.toLocaleString()}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">
                  {transactionType === 'deposit' ? 'Source of Money' : 'Payment Destination'}
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSourceType('external')}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${sourceType === 'external' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    📱 External
                  </button>
                  <button
                    onClick={() => setSourceType('account')}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${sourceType === 'account' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    🏦 Account Transfer
                  </button>
                </div>
              </div>

              {sourceType === 'external' && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Select Source</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_SOURCES.map(source => (
                      <button
                        key={source.id}
                        onClick={() => setExternalSource(source.id)}
                        className={`p-3 rounded-2xl text-center transition-all border-2 ${externalSource === source.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}
                      >
                        <div className="text-2xl mb-1">{source.icon}</div>
                        <div className="text-xs font-bold text-gray-700 leading-tight">{source.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sourceType === 'account' && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">
                    {transactionType === 'deposit' ? 'Transfer From' : 'Transfer To'}
                  </label>
                  <select
                    value={sourceAccountId}
                    onChange={e => setSourceAccountId(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Account</option>
                    {banks.filter(b => b.id !== selectedBank.id).map(b => (
                      <option key={b.id} value={b.id}>{b.name} (RS. {b.calculatedBalance.toLocaleString()})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Amount (RS.)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full border border-gray-200 p-3 rounded-xl text-lg font-black outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  min="1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Description *</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full border border-gray-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Customer payment, Shop expense..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Date</label>
                <input
                  type="date"
                  value={transactionDate}
                  onChange={e => setTransactionDate(e.target.value)}
                  className="w-full border border-gray-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={submitTransaction}
                  className={`flex-1 py-3 rounded-2xl font-black text-white transition-colors ${transactionType === 'deposit' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}
                >
                  {transactionType === 'deposit' ? '✅ Add Money IN' : '✅ Add Money OUT'}
                </button>
                <button onClick={() => setShowModal(false)} className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-2xl font-bold transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
