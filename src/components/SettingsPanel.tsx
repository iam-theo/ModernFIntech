import React, { useState } from "react";
import { Sliders, ToggleLeft, ToggleRight, Sparkles, Key, AlertCircle, RefreshCw, PlusCircle, ArrowDown } from "lucide-react";

interface SettingsPanelProps {
  settings: {
    mode: string;
    flutterwavePublicKey: string;
    flutterwaveSecretKey: string;
    nellobyteApiKey: string;
    nellobyteUserId: string;
    termiiApiKey?: string;
    termiiSenderId?: string;
    termiiChannel?: string;
  };
  notifications: any[];
  onRefreshNotifications: () => void;
  onSaveSettings: (settings: any) => Promise<void>;
  onTriggerInboundDeposit: (amount: number, senderName: string, senderBank: string) => Promise<void>;
  onResetDb: () => Promise<void>;
}

export function SettingsPanel({ 
  settings, 
  notifications,
  onRefreshNotifications,
  onSaveSettings, 
  onTriggerInboundDeposit, 
  onResetDb 
}: SettingsPanelProps) {
  const [mode, setMode] = useState(settings.mode);
  
  // Credentials dynamic forms
  const [flwPub, setFlwPub] = useState(settings.flutterwavePublicKey);
  const [flwSec, setFlwSec] = useState(settings.flutterwaveSecretKey);
  const [nelApi, setNelApi] = useState(settings.nellobyteApiKey);
  const [nelUser, setNelUser] = useState(settings.nellobyteUserId);
  const [termKey, setTermKey] = useState(settings.termiiApiKey || "");
  const [termSender, setTermSender] = useState(settings.termiiSenderId || "FW_ALERT");
  const [termChannel, setTermChannel] = useState(settings.termiiChannel || "generic");

  // Deposit simulation fields
  const [depositAmount, setDepositAmount] = useState("25000");
  const [depositSender, setDepositSender] = useState("Oluwaseun Alake");
  const [depositBank, setDepositBank] = useState("Guaranty Trust Bank (GTBank)");

  const [savingKeys, setSavingKeys] = useState(false);
  const [triggeringInflow, setTriggeringInflow] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [apiFeedback, setApiFeedback] = useState<string | null>(null);

  // Auto-resolve whitelisting IP addresses
  const [publicIp, setPublicIp] = useState("Loading IP...");
  
  React.useEffect(() => {
    fetch("/api/ip")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.ip) {
          setPublicIp(data.ip);
        } else {
          setPublicIp("Manual configure needed");
        }
      })
      .catch(() => setPublicIp("Manual configure needed"));
  }, []);

  const handleToggleMode = async (targetMode: "sandbox" | "live") => {
    setMode(targetMode);
    setApiFeedback(null);
    try {
      await onSaveSettings({
        mode: targetMode,
        flutterwavePublicKey: flwPub,
        flutterwaveSecretKey: flwSec,
        nellobyteApiKey: nelApi,
        nellobyteUserId: nelUser,
        termiiApiKey: termKey,
        termiiSenderId: termSender,
        termiiChannel: termChannel
      });
      setApiFeedback(`System successfully set to ${targetMode.toUpperCase()} mode.`);
    } catch {
      setApiFeedback("Error updating engine gateway mode.");
    }
  };

  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKeys(true);
    setApiFeedback(null);
    try {
      await onSaveSettings({
        mode,
        flutterwavePublicKey: flwPub,
        flutterwaveSecretKey: flwSec,
        nellobyteApiKey: nelApi,
        nellobyteUserId: nelUser,
        termiiApiKey: termKey,
        termiiSenderId: termSender,
        termiiChannel: termChannel
      });
      setApiFeedback("Gateway & Termii SMS credentials stored correctly on the backend server!");
    } catch (err: any) {
      setApiFeedback("Error committing keys: " + err.message);
    } finally {
      setSavingKeys(false);
    }
  };

  const handleSimulateInflow = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(depositAmount);
    if (isNaN(val) || val <= 0) return;
    setTriggeringInflow(true);
    setApiFeedback(null);
    try {
      await onTriggerInboundDeposit(val, depositSender, depositBank);
      setApiFeedback(`Simulated ₦${val.toLocaleString()} inflow posted instantly! Ledger was credited.`);
    } catch (err: any) {
      setApiFeedback("Failed to trigger simulation payment: " + err.message);
    } finally {
      setTriggeringInflow(false);
    }
  };

  const handleResetData = async () => {
    if (!confirm("Are you sure you want to completely restore default starter database states? This will wipe recent transactions.")) return;
    setResetting(true);
    try {
      await onResetDb();
      setApiFeedback("Database successfully reset. Reload the tab to observe default balances.");
      window.location.reload();
    } catch (e: any) {
      setApiFeedback("Failed to execute db restoration: " + e.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-xs space-y-8">
      
      {/* Settings Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display text-slate-800">Sandbox & Gateway Controls</h2>
            <p className="text-xs text-slate-400">Manage API connections and mock simulations</p>
          </div>
        </div>
        
        {/* Rapid Mode Switcher Pill */}
        <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 p-1 rounded-xl">
          <button
            onClick={() => handleToggleMode("sandbox")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${mode === "sandbox" ? "bg-indigo-600 text-white shadow-2xs" : "text-slate-500 hover:text-slate-800"}`}
            id="mode-sandbox-toggle"
          >
            Sandbox
          </button>
          <button
            onClick={() => handleToggleMode("live")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${mode === "live" ? "bg-indigo-600 text-white shadow-2xs" : "text-slate-500 hover:text-slate-800"}`}
            id="mode-live-toggle"
          >
            Live Gateway
          </button>
        </div>
      </div>

      {apiFeedback && (
        <div className="p-3.5 bg-indigo-50 border border-indigo-100 text-indigo-800 rounded-xl text-xs font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span id="settings-feedback-field">{apiFeedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Segment 1: Live API Configurations Form */}
        <form onSubmit={handleSaveKeys} className="space-y-4">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-sm border-b border-slate-100 pb-2">
            <Key className="w-4 h-4 text-indigo-500" />
            <span>Gateway API Credentials</span>
          </div>

          <p className="text-xs text-slate-400 leading-normal">
            Switch to Live Mode above and enter your Flutterwave Secret and Nellobyte Api keys to execute live routing transactions.
          </p>

          <div className="space-y-3.5">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Flutterwave Public Key</label>
              <input
                type="text"
                value={flwPub}
                onChange={(e) => setFlwPub(e.target.value)}
                placeholder="FLWPUBK_xx_xxxxxxxxxxxxxxxx"
                className="w-full h-10 px-3.5 text-xs font-mono bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 rounded-xl text-slate-800 focus:outline-hidden"
                id="param-flw-pub"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Flutterwave Secret Key</label>
              <input
                type="password"
                value={flwSec}
                onChange={(e) => setFlwSec(e.target.value)}
                placeholder="FLWSECK_xx_xxxxxxxxxxxxxxxx"
                className="w-full h-10 px-3.5 text-xs font-mono bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 rounded-xl text-slate-800 focus:outline-hidden"
                id="param-flw-sec"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Nellobyte Developer API Key</label>
              <input
                type="password"
                value={nelApi}
                onChange={(e) => setNelApi(e.target.value)}
                placeholder="NELLOBYTE_SECRET_API_KEY_xxxx"
                className="w-full h-10 px-3.5 text-xs font-mono bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 rounded-xl text-slate-800 focus:outline-hidden"
                id="param-nel-key"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Nellobyte Biller UserID (Optional)</label>
              <input
                type="text"
                value={nelUser}
                onChange={(e) => setNelUser(e.target.value)}
                placeholder="e.g. USER_ID_xxxx"
                className="w-full h-10 px-3.5 text-xs font-mono bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 rounded-xl text-slate-800 focus:outline-hidden"
                id="param-nel-user"
              />
            </div>

            <div className="flex flex-col gap-1 border-t border-slate-100 pt-3 mt-1">
              <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest font-mono">Termii SMS API Key</label>
              <input
                type="password"
                value={termKey}
                onChange={(e) => setTermKey(e.target.value)}
                placeholder="TLxxxx (Termii API key)"
                className="w-full h-10 px-3.5 text-xs font-mono bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 rounded-xl text-slate-800 focus:outline-hidden"
                id="param-termii-key"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Termii Sender ID</label>
                <input
                  type="text"
                  value={termSender}
                  onChange={(e) => setTermSender(e.target.value)}
                  placeholder="FW_ALERT"
                  className="w-full h-10 px-3.5 text-xs font-mono bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 rounded-xl text-slate-800 focus:outline-hidden"
                  id="param-termii-sender"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Termii Channel</label>
                <select
                  value={termChannel}
                  onChange={(e) => setTermChannel(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 rounded-xl text-slate-800 focus:outline-hidden cursor-pointer"
                  id="param-termii-channel"
                >
                  <option value="generic">Generic Route</option>
                  <option value="dnd">DND Route</option>
                  <option value="whatsapp">WhatsApp Route</option>
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingKeys}
            className="w-full h-10 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            id="save-settings-btn"
          >
            {savingKeys ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Encrypting & Storing...
              </>
            ) : (
              <>
                <span>Save Live Credentials</span>
              </>
            )}
          </button>
        </form>

        {/* IP Whitelisting Info Guide */}
        <div className="space-y-4">
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-3xl space-y-3.5">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Flutterwave Live IP Whitelist Config
            </h4>
            
            <p className="text-[11px] text-slate-500 leading-relaxed">
              When using Flutterwave Live mode payouts, Flutterwave strictly mandates whitelisting your server's outbound requests to prevent unauthorized payout calls.
            </p>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                Your Public Server Outbound IP:
              </span>
              <div className="flex items-center gap-2">
                <code className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-indigo-600 font-bold flex-1 select-all break-all shadow-3xs" id="copyable-outbound-ip">
                  {publicIp}
                </code>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200/60 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 block">
                How to set up on Flutterwave Dashboard:
              </span>
              <ol className="list-decimal pl-4 text-[11px] text-slate-550 space-y-1.5 leading-normal">
                <li>Log in to your <strong>Live Flutterwave Merchant Dashboard</strong>.</li>
                <li>Navigate to <strong>Settings</strong> &raquo; <strong>Developer Menu</strong> &raquo; <strong>API Keys</strong>.</li>
                <li>Find the <strong>IP Whitelist</strong> text area input field.</li>
                <li>Paste your server outbound IP: <code className="text-indigo-650 bg-white font-bold px-1 py-0.5 border border-slate-100 rounded">{publicIp}</code> into it.</li>
                <li>Click <strong>Save Changes</strong> to lock it down.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Segment 2: Inbound Funds Direct Simulate Webhook */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-sm border-b border-slate-100 pb-2">
            <ArrowDown className="w-4 h-4 text-emerald-500 animate-bounce" />
            <span>Simulate Incoming Funds (Receive Money)</span>
          </div>

          <p className="text-xs text-slate-400 leading-normal">
            Flutterwave processes incoming bank transfers using webhooks. Simulate receiving funds into your virtual account. Instantly tests balances and automated receipts!
          </p>

          <form onSubmit={handleSimulateInflow} className="space-y-3 p-4 bg-slate-50 border border-slate-250/30 rounded-2xl">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Deposit Sender Name</label>
              <input
                type="text"
                value={depositSender}
                onChange={(e) => setDepositSender(e.target.value)}
                placeholder="Aliko Dangote"
                className="w-full h-9 px-3 text-xs bg-white border border-slate-200 focus:border-indigo-400 rounded-lg text-slate-700 focus:outline-hidden"
                id="deposit-name-input"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Transfer Amount (₦)</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="25000"
                  className="w-full h-9 px-3 text-xs font-semibold bg-white border border-slate-200 focus:border-indigo-400 rounded-lg text-slate-700 focus:outline-hidden"
                  id="deposit-amount-input"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Origin Bank</label>
                <input
                  type="text"
                  value={depositBank}
                  onChange={(e) => setDepositBank(e.target.value)}
                  placeholder="Access Bank"
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-200 focus:border-indigo-400 rounded-lg text-slate-700 focus:outline-hidden"
                  id="deposit-bank-input"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={triggeringInflow}
              className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all focus:ring-2 focus:ring-emerald-500 cursor-pointer text-center"
              id="deposit-simulation-btn"
            >
              {triggeringInflow ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Broadcasting webhook event...
                </>
              ) : (
                <>
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Post Inflow ₦{(parseFloat(depositAmount) || 0).toLocaleString()}</span>
                </>
              )}
            </button>
          </form>

          {/* Database Reset button */}
          <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-xs">
            <span className="text-slate-400">Want to clear transaction records?</span>
            <button
              onClick={handleResetData}
              disabled={resetting}
              className="px-3 py-1.5 hover:bg-rose-50 border border-rose-100 text-rose-600 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-all"
              id="reset-state-btn"
            >
              <RefreshCw className={`w-3 h-3 ${resetting ? 'animate-spin' : ''}`} />
              Reset App Data
            </button>
          </div>
        </div>

      </div>

      {/* Segment 3: Real-time Multi-Channel Notification Logs */}
      <div className="border-t border-slate-100 pt-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-850 font-display flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
              </span>
              Gateway Dispatch Logs (SMS, E-Mail & Push Sync)
            </h3>
            <p className="text-xs text-slate-400">Visual database tracking Termii SMS delivery & simulated webhooks</p>
          </div>
          <button
            type="button"
            onClick={onRefreshNotifications}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-all border border-slate-200"
            id="refresh-notif-logs-btn"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Sync Logs</span>
          </button>
        </div>

        {notifications.length === 0 ? (
          <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
            No notification events dispatched yet. Process a transaction to trigger a dispatch!
          </div>
        ) : (
          <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
            <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-150">
              {notifications.map((notif: any) => {
                let badgeStyle = "bg-indigo-50 text-indigo-700 border-indigo-100";
                if (notif.type === "email") badgeStyle = "bg-sky-50 text-sky-700 border-sky-100";
                if (notif.type === "push") badgeStyle = "bg-amber-50 text-amber-700 border-amber-100";
                
                let sStyle = "text-emerald-600 bg-emerald-50 border-emerald-100";
                if (notif.status === "failed") sStyle = "text-rose-600 bg-rose-50 border-rose-100";
                if (notif.status === "pending") sStyle = "text-amber-600 bg-amber-50 border-amber-105";

                return (
                  <div key={notif.id} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider ${badgeStyle}`}>
                          {notif.type}
                        </span>
                        <span className="font-mono text-slate-400 text-[10px]">Recipient: {notif.recipient}</span>
                        <span className="text-[10px] text-slate-400">&bull; {new Date(notif.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-700 font-medium leading-relaxed max-w-xl">{notif.message}</p>
                      {notif.gatewayResponse && (
                        <div className="mt-1.5 p-2 bg-slate-100 rounded-lg text-[10px] font-mono text-slate-500 overflow-x-auto max-w-full">
                          <span className="font-bold text-slate-700 block mb-0.5">Gateway JSON Metadata:</span>
                          {JSON.stringify(notif.gatewayResponse)}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 flex sm:flex-col items-start sm:items-end gap-2 sm:gap-1 text-right">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold capitalize ${sStyle}`}>
                        {notif.status}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono italic">
                        {notif.gatewayResponse?.simulation ? "Sandbox Mocked" : "Direct Gateway"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
