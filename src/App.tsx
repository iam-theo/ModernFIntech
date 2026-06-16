import React, { useState, useEffect } from "react";
import { UserProfile, Transaction } from "./types";
import { TransferForm } from "./components/TransferForm";
import { BillsForm } from "./components/BillsForm";
import { SettingsPanel } from "./components/SettingsPanel";
import { ReceiptModal } from "./components/ReceiptModal";
import { 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  Copy, 
  Check, 
  Smartphone, 
  Zap, 
  Tv, 
  Briefcase, 
  Sliders, 
  Inbox, 
  RefreshCw, 
  FileText, 
  Lock, 
  Activity, 
  HelpCircle,
  PlusCircle,
  ShieldCheck,
  Loader2,
  Mail,
  MessageSquare,
  Bell,
  X,
  AlertTriangle,
  CheckCircle,
  Info
} from "lucide-react";

interface ToastItem {
  id: string;
  type: "success" | "error" | "sms" | "email" | "push" | "info";
  title: string;
  message: string;
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [activeTab, setActiveTab] = useState<"transfer" | "bills" | "settings">("transfer");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // UI state managers
  const [copiedText, setCopiedText] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Virtual account creation dialog state
  const [showVAcctPrompt, setShowVAcctPrompt] = useState(false);
  const [vAcctFullName, setVAcctFullName] = useState("");
  const [vAcctBvn, setVAcctBvn] = useState("");
  const [vAcctLoading, setVAcctLoading] = useState(false);
  const [vaError, setVaError] = useState<string | null>(null);

  // Toast notifier helper
  const triggerToast = (title: string, message: string, type: ToastItem["type"] = "success") => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    const newToast: ToastItem = { id, type, title, message };
    
    setToasts(prev => [newToast, ...prev].slice(0, 5));
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const fetchState = async () => {
    setIsRefreshing(true);
    try {
      const resp = await fetch("/api/state");
      const data = await resp.json();
      setUser(data.user);
      setTransactions(data.transactions);
      setSettings(data.apiSettings);
      
      const notifResp = await fetch("/api/notifications");
      const notifData = await notifResp.json();
      setNotifications(notifData);
      
      // Auto-set the virtual acct registration fields if empty
      if (data.user) {
        setVAcctFullName(data.user.fullName);
      }
    } catch (e) {
      console.error("Error communicating with backend API engine:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  // Copy virtual account function
  const handleCopyAccount = () => {
    if (!user?.virtualAccount) return;
    navigator.clipboard.writeText(user.virtualAccount.accountNumber);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Virtual account generation handler
  const handleGenerateVirtualAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setVaError(null);
    setVAcctLoading(true);
    try {
      const response = await fetch("/api/user/virtual-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: vAcctFullName,
          bvn: vAcctBvn || "22233445566"
        })
      });

      const data = await response.json();
      if (data.success) {
        setUser(prev => prev ? { ...prev, virtualAccount: data.virtualAccount, balance: prev.balance + (data.isSandbox ? 15000 : 0) } : null);
        setShowVAcctPrompt(false);
        setVAcctBvn("");
        
        // Trigger multi-channel real-time toasts
        triggerToast("Virtual Account Provisioned", `Your dedicated account is ready: ${data.virtualAccount.accountNumber}`, "success");
        triggerToast("Termii SMS Sent", `Direct SMS dispatch processed via Termii gateway.`, "sms");
        triggerToast("E-Mail Receipt Dispatched", `Notification invoice sent to ${user?.email || 'your email'}`, "email");
        triggerToast("Push Alert Screen Broadcaster", "Web push notify token registered & broadcasted.", "push");

        // Refresh full history
        fetchState();
      } else {
        setVaError(data.message || "Failed to initialize account registry.");
        triggerToast("Provision Failed", data.message || "Establishing bank routing failed.", "error");
      }
    } catch {
      setVaError("Network connection timeout. Reverting to sandbox generator.");
      triggerToast("Connection Trouble", "Server connection timeout.", "error");
    } finally {
      setVAcctLoading(false);
    }
  };

  // Upstream transaction callback synchronizers
  const handleTransferCompleted = (newTx: any, finalBalance: number) => {
    setTransactions(prev => [newTx, ...prev]);
    setUser(prev => prev ? { ...prev, balance: finalBalance } : null);
    setSelectedTx(newTx); // Launch the printed receipt automatically!

    // Trigger multi-channel real-time toasts
    triggerToast("Transfer Completed", `Transferred NGN ${newTx.amount.toLocaleString()} successfully.`, "success");
    triggerToast("Termii SMS Alert", `Live SMS Debit Alert dispatch triggered via Termii.`, "sms");
    triggerToast("Email Debit Receipt", `Electronic receipt document mailed successfully.`, "email");
    triggerToast("Push Alert Active", `Debit alert broadcasted to host device.`, "push");

    fetchState(); // sync logs
  };

  const handleBillCompleted = (newTx: any, finalBalance: number) => {
    setTransactions(prev => [newTx, ...prev]);
    setUser(prev => prev ? { ...prev, balance: finalBalance } : null);
    setSelectedTx(newTx); // Launch the printed receipt automatically!

    // Trigger multi-channel real-time toasts
    triggerToast("Bill Purchased", `Settled ${newTx.billType?.toUpperCase()} bill of NGN ${newTx.amount.toLocaleString()} successfully.`, "success");
    triggerToast("Termii Code SMS", `Bill receipt voucher token delivered via Termii SMS.`, "sms");
    triggerToast("Invoice E-Mail Sent", `Digital PDF itemized invoice sent to ${user?.email}`, "email");
    triggerToast("Push Informer", `Secure bill confirmation badge sent to screen status.`, "push");

    fetchState(); // sync logs
  };

  const handleSaveSettings = async (newSettings: any) => {
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSettings)
    });
    const data = await response.json();
    setSettings(data.settings);
    triggerToast("Settings Applied", "Server system variables and Termii integrations successfully updated.", "info");
    fetchState();
  };

  const handleTriggerInboundInflow = async (amount: number, senderName: string, senderBank: string) => {
    const response = await fetch("/api/sandbox/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, senderName, senderBank })
    });
    const data = await response.json();
    if (data.success) {
      setTransactions(prev => [data.transaction, ...prev]);
      setUser(prev => prev ? { ...prev, balance: prev.balance + amount } : null);
      setSelectedTx(data.transaction); // Open receipt instantly

      // Trigger multi-channel real-time toasts
      triggerToast("Inward Fund Received", `Wallet credited with NGN ${amount.toLocaleString()}`, "success");
      triggerToast("Termii SMS Alert", `Real-time SMS credit notification delivered via Termii.`, "sms");
      triggerToast("Email Credit Advice", `Statement advice mail transmitted to ${user?.email}`, "email");
      triggerToast("Push Alert Inflow", `Visual credit badge popped on screen.`, "push");

      fetchState();
    }
  };

  const handleResetData = async () => {
    await fetch("/api/settings/reset", { method: "POST" });
    triggerToast("State Restored", "Sandbox ledger and keys have been reset.", "info");
    await fetchState();
  };

  if (!user || !settings) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
        <h2 className="text-lg font-bold font-display text-slate-800">Booting Fintech Engine...</h2>
        <p className="text-xs text-slate-400 mt-1">Starting full-stack Express router & server environments</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      
      {/* Visual Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-white border-b border-slate-100 px-6 py-4 shadow-2xs no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold tracking-tight text-xl font-display shadow-indigo-200/50 shadow-md">
              FW
            </div>
            <div>
              <h1 className="text-lg font-bold font-display text-slate-900 leading-tight">Fintech Wallet Pro</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${settings.mode === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-500 animate-pulse'}`}></span>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                  {settings.mode === "live" ? "Live Gateway Active" : "Sandbox Simulator"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-slate-800 font-bold">{user.fullName}</span>
              <span className="text-slate-400 text-[10px] font-mono">{user.email}</span>
            </div>
            <button
              onClick={fetchState}
              disabled={isRefreshing}
              className="p-2 hover:bg-slate-100 rounded-xl transition-all cursor-pointer text-slate-500 hover:text-indigo-600"
              title="Refresh ledger database"
              id="global-refresh-btn"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Core Body */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Hand: Financial stats, Balance summaries, Accounts details */}
        <div className="lg:col-span-4 space-y-6 no-print">
          
          {/* Card: Wallet balance display */}
          <div className="bg-indigo-950 text-white rounded-3xl p-6 relative overflow-hidden shadow-xl shadow-indigo-900/10">
            {/* Ambient visual shapes in BG */}
            <div className="absolute right-[-40px] top-[-40px] w-48 h-48 rounded-full bg-indigo-800/20 blur-xl pointer-events-none"></div>
            <div className="absolute left-[-20px] bottom-[-20px] w-36 h-36 rounded-full bg-indigo-500/10 blur-xl pointer-events-none"></div>
            
            <div className="flex items-center justify-between mb-8 z-10 relative">
              <span className="text-indigo-300 font-mono text-xs uppercase tracking-widest">
                Available Wallet Balance
              </span>
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>

            <h3 className="text-4xl font-bold font-display tracking-tight z-10 relative">
              ₦{user.balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </h3>

            <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-indigo-900/60 z-10 relative">
              <div>
                <span className="block text-[10px] text-indigo-300 uppercase font-mono">Commission Rate</span>
                <span className="text-sm font-semibold text-white">0.02% (Cap 50)</span>
              </div>
              <div>
                <span className="block text-[10px] text-indigo-300 uppercase font-mono">Ledger State</span>
                <span className="text-sm font-semibold text-white">Settled ✓</span>
              </div>
            </div>
          </div>

          {/* Card: Dedicated Virtual account specifications */}
          {user.virtualAccount ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-850 font-display">Dedicated Virtual Account</h4>
                  <p className="text-[10px] text-slate-400">Receive payments via direct bank transfer</p>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 text-indigo-700 bg-indigo-50 rounded-md border border-indigo-100 uppercase tracking-wider">
                  Permanent
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3 font-mono text-xs text-slate-700">
                <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-200">
                  <span className="text-slate-400 font-sans">Provider Bank:</span>
                  <span className="font-semibold text-slate-800">{user.virtualAccount.bankName}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-200">
                  <span className="text-slate-400 font-sans">Account Number:</span>
                  <button
                    onClick={handleCopyAccount}
                    className="flex items-center gap-1 hover:text-indigo-600 transition-colors cursor-pointer group"
                    title="Copy Account NUBAN"
                    id="copy-va-btn"
                  >
                    <span className="font-bold text-slate-900 block tracking-wider mr-1">
                      {user.virtualAccount.accountNumber}
                    </span>
                    {copiedText ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                    )}
                  </button>
                </div>

                <div className="flex justify-between items-start">
                  <span className="text-slate-400 font-sans">Account Name:</span>
                  <span className="font-semibold text-slate-800 text-right max-w-[150px] truncate">
                    {user.virtualAccount.accountName}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-400 leading-normal">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0"></span>
                <span>Funds received into this number increment your wallet balance instantly.</span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-dashed border-indigo-200 p-6 shadow-2xs text-center space-y-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 font-display">Generate Virtual Account</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">Initialize your Flutterwave dedicated account to enable secure inward transfers</p>
              </div>
              <button
                onClick={() => setShowVAcctPrompt(true)}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                id="spawn-va-prompt-btn"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Establish Dedicated Account</span>
              </button>
            </div>
          )}

          {/* Quick Sandbox Alert Banner */}
          {settings.mode === "sandbox" && (
            <div className="bg-amber-50 border border-amber-200/70 rounded-2xl p-4 text-xs font-medium text-amber-800 flex items-start gap-2.5">
              <Zap className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <p className="font-bold">Sandbox Playground</p>
                <p className="text-amber-700 text-[11px] leading-normal mt-0.5">
                  Transactions are simulated. Use the **Inflow simulation** tool inside settings to receive virtual funds instantly.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Right Hand / Main Content side: Forms & logs */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Tabs header selector */}
          <div className="flex border-b border-slate-200/80 gap-6 text-sm no-print font-medium">
            <button
              onClick={() => setActiveTab("transfer")}
              className={`pb-3.5 border-b-2 font-display text-md cursor-pointer transition-all ${activeTab === "transfer" ? "border-indigo-600 text-indigo-600 font-bold" : "border-transparent text-slate-400 hover:text-slate-600"}`}
              id="tab-act-transfer"
            >
              Direct Bank Transfer
            </button>
            
            <button
              onClick={() => setActiveTab("bills")}
              className={`pb-3.5 border-b-2 font-display text-md cursor-pointer transition-all ${activeTab === "bills" ? "border-indigo-600 text-indigo-600 font-bold" : "border-transparent text-slate-400 hover:text-slate-600"}`}
              id="tab-act-bills"
            >
              Bills & Utilities
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`pb-3.5 border-b-2 font-display text-md flex items-center gap-1.5 cursor-pointer transition-all ${activeTab === "settings" ? "border-indigo-600 text-indigo-600 font-bold" : "border-transparent text-slate-400 hover:text-slate-600"}`}
              id="tab-act-settings"
            >
              <Sliders className="w-4 h-4" />
              <span>Sandbox Console</span>
            </button>
          </div>

          {/* Tab content bodies */}
          <div className="no-print">
            {activeTab === "transfer" && (
              <TransferForm user={user} onTransferSuccess={handleTransferCompleted} />
            )}

            {activeTab === "bills" && (
              <BillsForm user={user} onBillSuccess={handleBillCompleted} />
            )}

            {activeTab === "settings" && (
              <SettingsPanel 
                settings={settings} 
                notifications={notifications}
                onRefreshNotifications={fetchState}
                onSaveSettings={handleSaveSettings}
                onTriggerInboundDeposit={handleTriggerInboundInflow}
                onResetDb={handleResetData}
              />
            )}
          </div>

          {/* Table list block: Transaction histories */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-xs relative no-print">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold font-display text-slate-800">Transaction Receipts Log</h3>
                <p className="text-xs text-slate-400 mt-0.5">Click any record below to view and print automated receipts</p>
              </div>
              <FileText className="w-5 h-5 text-slate-400" />
            </div>

            {transactions.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-2">
                <Inbox className="w-10 h-10 text-slate-300" />
                <p className="text-xs text-slate-400" id="empty-tx-label">No transaction receipts issued yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs select-none">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-450 uppercase tracking-widest border-b border-slate-100">
                      <th className="pb-3 text-slate-400">Transaction ID & Type</th>
                      <th className="pb-3 text-slate-400">Beneficiary / Memo</th>
                      <th className="pb-3 text-slate-400">Gateway Ref</th>
                      <th className="pb-3 text-right text-slate-400">Ledger Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((tx) => (
                      <tr 
                        key={tx.id} 
                        onClick={() => setSelectedTx(tx)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                        title="Open Print Receipt"
                        id={`tx-row-${tx.id}`}
                      >
                        <td className="py-3.5 flex items-center gap-3">
                          <div className={`p-2 rounded-xl shrink-0 group-hover:scale-105 transition-all ${
                            tx.type === 'incoming_transfer' ? 'bg-emerald-50 text-emerald-600' : 
                            tx.type === 'outgoing_transfer' ? 'bg-rose-50 text-rose-600' : 'bg-sky-50 text-sky-600'
                          }`}>
                            {tx.type === 'incoming_transfer' ? <ArrowDownLeft className="w-4 h-4" /> : 
                             tx.type === 'outgoing_transfer' ? <ArrowUpRight className="w-4 h-4" /> : 
                             tx.billType === 'electricity' ? <Zap className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="font-bold block text-slate-800 font-display capitalise">
                              {tx.type.replace(/_/g, " ")}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                              {new Date(tx.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5">
                          <span className="font-semibold text-slate-700 block max-w-[150px] truncate">
                            {tx.type === 'incoming_transfer' ? (tx.senderName || 'Inflow') :
                             tx.type === 'outgoing_transfer' ? tx.recipientName : tx.billDetails?.provider}
                          </span>
                          <span className="text-[10px] text-slate-400 italic block mt-0.5 truncate max-w-[150px]">
                            {tx.description}
                          </span>
                        </td>

                        <td className="py-3.5">
                          <span className="font-mono text-[10px] text-slate-450 uppercase block select-all">
                            {tx.reference}
                          </span>
                        </td>

                        <td className="py-3.5 text-right">
                          <span className={`font-bold block font-display text-sm ${
                            tx.type === 'incoming_transfer' ? 'text-emerald-600' : 'text-slate-800'
                          }`}>
                            {tx.type === 'incoming_transfer' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                            Fee: ₦{tx.fee}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </main>

      {/* MODAL: Virtual Account Generator Trigger Dialog */}
      {showVAcctPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-6 border border-slate-100 animate-scale-up">
            <h3 className="text-lg font-bold font-display text-slate-800 mb-2">Create Permanent Virtual Account</h3>
            <p className="text-xs text-slate-500 leading-normal mb-5">
              Input credentials below to generate your commercial banking routing details with Flutterwave.
            </p>

            <form onSubmit={handleGenerateVirtualAccount} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Account Holder Full Name</label>
                <input
                  type="text"
                  value={vAcctFullName}
                  onChange={(e) => setVAcctFullName(e.target.value)}
                  className="w-full h-10 px-3.5 text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 rounded-xl"
                  required
                  id="va-fullname-input"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Bank Verification Number (BVN)</label>
                <input
                  type="text"
                  pattern="[0-9]*"
                  maxLength={11}
                  placeholder="22233445566 (Simulated)"
                  value={vAcctBvn}
                  onChange={(e) => setVAcctBvn(e.target.value.replace(/\D/g, ""))}
                  className="w-full h-10 px-3.5 text-sm font-mono bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 rounded-xl"
                  id="va-bvn-input"
                  required
                />
                <span className="text-[9px] text-slate-400 mt-1 leading-normal italic block">
                  * Live Flutterwave production demands a valid 11 digit BVN registry. Sandbox accepts any mock 11 digits.
                </span>
              </div>

              {vaError && (
                <div className="p-3 bg-rose-50 text-rose-800 rounded-xl text-xs font-semibold">
                  {vaError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVAcctPrompt(false)}
                  className="flex-1 h-10 hover:bg-slate-100 text-slate-600 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                  id="cancel-va-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={vAcctLoading}
                  className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold text-xs rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  id="submit-va-btn"
                >
                  {vAcctLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <span>Provision Now</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT DIALOG LAYOUT PREVIEW (Appears ONLY during print operations) */}
      {selectedTx && (
        <div className="hidden print:block">
          <div className="p-8 bg-white text-slate-900 border border-slate-200 rounded-lg">
            <h2 className="text-xl font-bold border-b pb-4 mb-4 text-center">Wallet Transaction Receipt</h2>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between">
                <span>Reference:</span>
                <span>{selectedTx.reference}</span>
              </div>
              <div className="flex justify-between">
                <span>Timestamp:</span>
                <span>{new Date(selectedTx.timestamp).toLocaleString("en-NG")}</span>
              </div>
              <div className="flex justify-between">
                <span>Operation:</span>
                <span className="capitalize">{selectedTx.type.replace(/_/g, " ")}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2 text-lg">
                <span>Settled Amount:</span>
                <span>₦{(selectedTx.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Gateway Fee:</span>
                <span>₦{selectedTx.fee}</span>
              </div>
              
              {selectedTx.recipientAccount && (
                <>
                  <div className="flex justify-between">
                    <span>Beneficiary Account:</span>
                    <span>{selectedTx.recipientAccount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Beneficiary Name:</span>
                    <span>{selectedTx.recipientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Beneficiary Bank:</span>
                    <span>{selectedTx.recipientBank}</span>
                  </div>
                </>
              )}

              {selectedTx.billDetails?.provider && (
                <div className="flex justify-between">
                  <span>Provider:</span>
                  <span>{selectedTx.billDetails.provider}</span>
                </div>
              )}

              {selectedTx.billDetails?.utilityToken && (
                <div className="p-3 bg-slate-100 text-center font-bold font-mono tracking-widest text-md mt-4 border">
                  Token: {selectedTx.billDetails.utilityToken}
                </div>
              )}
            </div>
            
            <div className="mt-8 border-t pt-4 text-center text-xs text-slate-400 italic">
              Thank you for transacting with Fintech Wallet. Verified payment secure via Flutterwave & Nellobyte Core API.
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Interactive Print Receipt Viewer modal */}
      {selectedTx && (
        <ReceiptModal 
          transaction={selectedTx} 
          onClose={() => setSelectedTx(null)} 
        />
      )}

      {/* Toast System Floating Mount */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-[380px] no-print">
        {toasts.map((toast) => {
          let icon = <CheckCircle className="w-5 h-5 text-emerald-500" />;
          let accent = "border-l-4 border-l-emerald-500";
          
          if (toast.type === "error") {
            icon = <AlertTriangle className="w-5 h-5 text-rose-500" />;
            accent = "border-l-4 border-l-rose-500";
          } else if (toast.type === "sms") {
            icon = <MessageSquare className="w-5 h-5 text-indigo-600" />;
            accent = "border-l-4 border-l-indigo-600";
          } else if (toast.type === "email") {
            icon = <Mail className="w-5 h-5 text-sky-500" />;
            accent = "border-l-4 border-l-sky-500";
          } else if (toast.type === "push") {
            icon = <Bell className="w-5 h-5 text-amber-500" />;
            accent = "border-l-4 border-l-amber-500";
          } else if (toast.type === "info") {
            icon = <Info className="w-5 h-5 text-slate-500" />;
            accent = "border-l-4 border-l-slate-400";
          }

          return (
            <div 
              key={toast.id}
              className={`flex items-start gap-3 p-4 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl shadow-xl transition-all duration-300 transform translate-x-0 ${accent} select-none`}
              style={{ animation: "slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
            >
              <div className="shrink-0 mt-0.5">{icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold font-display text-slate-800 truncate">{toast.title}</span>
                  <span className="text-[9px] font-mono font-bold text-slate-400 shrink-0">Just now</span>
                </div>
                <p className="text-[11px] text-slate-550 mt-0.5 leading-relaxed">{toast.message}</p>
              </div>
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="shrink-0 text-slate-400 hover:text-slate-600 p-0.5 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(110%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
      `}</style>

    </div>
  );
}
