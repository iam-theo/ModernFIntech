import React, { useState } from "react";
import { UserProfile, Bank } from "../types";
import { 
  ShieldCheck, 
  Sparkles, 
  HelpCircle, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  PlusCircle, 
  Check, 
  Activity, 
  UserPlus, 
  Layers, 
  Smartphone,
  Wallet,
  Coins
} from "lucide-react";

interface CollectionsPanelProps {
  user: UserProfile;
  banksList: Bank[];
  onRefreshAll: () => void;
  triggerToast: (title: string, message: string, type: "success" | "error" | "sms" | "email" | "push") => void;
}

export function CollectionsPanel({ user, banksList, onRefreshAll, triggerToast }: CollectionsPanelProps) {
  // KYC verification form states
  const [bvn, setBvn] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [kycPhone, setKycPhone] = useState("");
  const [isVerifyingKyc, setIsVerifyingKyc] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);
  const [kycSuccess, setKycSuccess] = useState<string | null>(null);

  // Dynamic virtual account creation form states
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expiryMinutes, setExpiryMinutes] = useState("15");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [accountsSuccess, setAccountsSuccess] = useState<string | null>(null);

  // Simulator actions state
  const [payingAccountId, setPayingAccountId] = useState<string | null>(null);

  // Handle KYC submit
  const handleKycVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setKycError(null);
    setKycSuccess(null);
    
    if (bvn.length !== 11) {
      setKycError("Bank Verification Number (BVN) must be precisely 11 digits.");
      return;
    }

    setIsVerifyingKyc(true);
    try {
      const response = await fetch("/api/kyc/verify-bvn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bvn,
          firstName,
          lastName,
          phone: kycPhone
        })
      });
      const data = await response.json();
      if (data.success) {
        setKycSuccess(data.message);
        triggerToast("KYC Status Upgraded", "Your level 2 verified status is now active!", "success");
        triggerToast("Termii SMS Alert", "Debit-limit warning & status modification SMS dispatched.", "sms");
        onRefreshAll();
        // Clear Form fields
        setBvn("");
        setFirstName("");
        setLastName("");
        setKycPhone("");
      } else {
        setKycError(data.message || "KYC lookup was rejected. Please re-check BVN digits.");
      }
    } catch (err: any) {
      setKycError("Error checking identity registers: " + err.message);
    } finally {
      setIsVerifyingKyc(false);
    }
  };

  // Handle Dynamic Virtual Account (Collections API) creation
  const handleCreateDynamicAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountsError(null);
    setAccountsSuccess(null);

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setAccountsError("Please enter a valid amount greater than zero.");
      return;
    }

    setIsCreatingAccount(true);
    try {
      const response = await fetch("/api/user/dynamic-virtual-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: val,
          description,
          expiryMinutes
        })
      });
      const data = await response.json();
      if (data.success) {
        setAccountsSuccess(`Temp collections account ${data.account.accountNumber} generated successfully!`);
        triggerToast("Collections Account Generated", `Temporary NUBAN generated for ₦${val.toLocaleString()}`, "success");
        triggerToast("Invoice Auto-Alert", "Direct electronic payment link emailed.", "email");
        onRefreshAll();
        // Reset fields
        setAmount("");
        setDescription("");
      } else {
        setAccountsError(data.message || "Failed provisioning short-term account through gateway.");
      }
    } catch (err: any) {
      setAccountsError("Gateway handshake failed: " + err.message);
    } finally {
      setIsCreatingAccount(false);
    }
  };

  // Trigger webhooks inbound simulation
  const handleSimulatePayment = async (accountNumber: string) => {
    setPayingAccountId(accountNumber);
    try {
      const response = await fetch("/api/sandbox/pay-dynamic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountNumber })
      });
      const data = await response.json();
      if (data.success) {
        triggerToast("Collection Paid", `Inbound Webhook matching dynamic ref processed cleanly!`, "success");
        triggerToast("Credit Notification Alert", `Ledger credited of ₦${data.account.amount.toLocaleString()}`, "push");
        onRefreshAll();
      } else {
        alert("Payment Simulation Failure: " + data.message);
      }
    } catch {
      alert("Handshake error.");
    } finally {
      setPayingAccountId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      
      {/* COLUMN A: BVN & KYC VERIFICATION PANEL */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShieldCheck className="w-5.5 h-5.5" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-display text-slate-800">KYC & BVN Verification</h3>
            <p className="text-xs text-slate-400">Upgrade limit tiers to Level 2 (Verified Merchant)</p>
          </div>
        </div>

        {user.kycStatus === "verified" ? (
          <div className="bg-emerald-50/55 border border-emerald-100 rounded-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-white border border-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-3xs">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <div>
              <h4 className="text-sm font-bold font-display text-slate-800">Your Account is Level 2 Verified!</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                BVN matches have been logged securely. Your single-disbursement wallet threshold has been expanded to ₦10,000,000.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleKycVerification} className="space-y-4 pt-1">
            <div className="bg-amber-50/50 border border-amber-100 p-3.5 rounded-xl text-xs text-amber-700 leading-relaxed flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                To satisfy central bank mandates on commercial transfers, associate your 11-digit BVN registry below. Any mock 11 digits are accepted in sandbox.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="E.g., Musa"
                  className="w-full h-10 px-3.5 text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 rounded-xl"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="E.g., Alake"
                  className="w-full h-10 px-3.5 text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                11-Digit BVN NUBAN Registry
              </label>
              <input
                type="text"
                pattern="[0-9]*"
                maxLength={11}
                value={bvn}
                onChange={(e) => setBvn(e.target.value.replace(/\D/g, ""))}
                placeholder="22233445566"
                className="w-full h-10 px-3.5 text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 rounded-xl font-mono"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Registered Phone Number</label>
              <input
                type="text"
                value={kycPhone}
                onChange={(e) => setKycPhone(e.target.value)}
                placeholder="E.g., +234 812 345 6789"
                className="w-full h-10 px-3.5 text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 rounded-xl"
                required
              />
            </div>

            {kycError && (
              <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl font-semibold">
                {kycError}
              </div>
            )}

            {kycSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl font-semibold">
                {kycSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifyingKyc}
              className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              {isVerifyingKyc ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Validating BVN registry...
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  Verify Identity & Upgrade
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* COLUMN B: DYNAMIC VIRTUAL ACCOUNTS CREATION (COLLECTIONS API) */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Coins className="w-5.5 h-5.5" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-display text-slate-800">Collections API</h3>
            <p className="text-xs text-slate-400">Spawn dynamic, one-time virtual checkout accounts</p>
          </div>
        </div>

        <form onSubmit={handleCreateDynamicAccount} className="space-y-4 pt-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Target Collection value (NGN)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 font-bold text-slate-400 select-none text-sm">₦</span>
              <input
                type="number"
                min="100"
                placeholder="E.g., 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-10 pl-8 pr-4 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 rounded-xl text-xs font-semibold"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Ref Description / Purpose
            </label>
            <input
              type="text"
              placeholder="e.g. invoice #234 Checkout"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 rounded-xl text-xs"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-display">
              V-Account Expiration window
            </label>
            <select
              value={expiryMinutes}
              onChange={(e) => setExpiryMinutes(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 rounded-xl text-xs text-slate-700"
            >
              <option value="15">15 minutes (Standard Checkout)</option>
              <option value="30">30 minutes</option>
              <option value="60">1 Hour</option>
              <option value="1440">24 Hours</option>
            </select>
          </div>

          {accountsError && (
            <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl font-semibold">
              {accountsError}
            </div>
          )}

          {accountsSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl font-semibold">
              {accountsSuccess}
            </div>
          )}

          <button
            type="submit"
            disabled={isCreatingAccount}
            className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            {isCreatingAccount ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Spawning collections route...
              </>
            ) : (
              <>
                <PlusCircle className="w-3.5 h-3.5" />
                Generate Web-Checkout Account
              </>
            )}
          </button>
        </form>

        {/* Dynamic accounts list tracker */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
            Active Collection Accounts
          </h4>

          {!user.dynamicAccounts || user.dynamicAccounts.length === 0 ? (
            <div className="p-5 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400">
              No temporary collections. Fill form to spawn short term checkout routers.
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {user.dynamicAccounts.map((account) => {
                const isPaid = account.status === "paid";
                const isExpired = account.status === "expired" || (new Date(account.expiry).getTime() < Date.now());
                const badgeStyle = isPaid 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                  : isExpired 
                    ? "bg-rose-50 text-rose-700 border-rose-100"
                    : "bg-indigo-50 text-indigo-700 border-indigo-100";
                
                return (
                  <div key={account.id} className="p-4 bg-slate-5 rounded-2xl border border-slate-200/50 space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 font-mono tracking-wide">
                        {account.bankName} • {account.accountNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md border font-bold uppercase text-[9px] ${badgeStyle}`}>
                        {account.status}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-500">
                      <span>Ref Purpose: {account.description}</span>
                      <span className="font-bold text-slate-800">
                        ₦{account.amount.toLocaleString()}
                      </span>
                    </div>

                    {!isPaid && !isExpired && (
                      <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-200/60">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5" />
                          Exp: {new Date(account.expiry).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        <button
                          onClick={() => handleSimulatePayment(account.accountNumber)}
                          disabled={payingAccountId === account.accountNumber}
                          className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-[11px] rounded-lg shadow-3xs cursor-pointer flex items-center gap-1 transition-all"
                        >
                          {payingAccountId === account.accountNumber ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Paying...
                            </>
                          ) : (
                            <>
                              <Wallet className="w-3 h-3" />
                              Simulate Webhook Inflow
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
