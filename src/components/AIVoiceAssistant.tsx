import React, { useState, useEffect, useRef } from "react";
import { UserProfile, Bank } from "../types";
import { 
  Sparkles, 
  Mic, 
  MicOff, 
  Send, 
  X, 
  MessageSquare, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Coins,
  ShieldAlert,
  ArrowRight
} from "lucide-react";

interface AIVoiceAssistantProps {
  user: UserProfile;
  onRefreshAll: () => void;
  triggerToast: (title: string, message: string, type: "success" | "error" | "sms" | "email" | "push") => void;
}

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: Date;
  draft?: {
    userIntent: "transfer" | "airtime" | "data" | "utility_bills" | "balance_query" | "general_chat";
    amount: number | null;
    bankCode: string | null;
    bankName: string | null;
    accountNumber: string | null;
    accountName?: string | null;
    phoneNumber: string | null;
    providerId: string | null;
    providerName?: string | null;
    packageName?: string | null;
    networkName?: string | null;
  };
}

export function AIVoiceAssistant({ user, onRefreshAll, triggerToast }: AIVoiceAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: `Hello ${user.fullName.split(" ")[0]}! I'm your Flutterwave voice broker. Click the Mic to say instructions like: "Transfer 5000 NGN to Access Bank account 1234567890" or "Recharge MTN airtime of 1000 NGN for 0812345678"`,
      timestamp: new Date()
    }
  ]);

  const [recognition, setRecognition] = useState<any>(null);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [transactionPin, setTransactionPin] = useState("");
  const [isExecutingTx, setIsExecutingTx] = useState(false);
  const [txSuccessMessage, setTxSuccessMessage] = useState<string | null>(null);
  const [txErrorMessage, setTxErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recInstance = new SpeechRecognition();
    recInstance.continuous = false;
    recInstance.interimResults = false;
    recInstance.lang = "en-NG"; // Tailored for Nigerian currency/bank contexts but fallback is standard English

    recInstance.onstart = () => {
      setIsListening(true);
      setTxErrorMessage(null);
    };

    recInstance.onend = () => {
      setIsListening(false);
    };

    recInstance.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      // Auto submit spoken query
      handleSendPrompt(transcript);
    };

    recInstance.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      setIsListening(false);
    };

    setRecognition(recInstance);
  }, []);

  // Scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const toggleListening = () => {
    if (!speechSupported) {
      triggerToast("Speech Not Supported", "Dynamic speech capture is disabled in your browser layout.", "error");
      return;
    }
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const handleSendPrompt = async (textToSend?: string) => {
    const prompt = textToSend || inputText;
    if (!prompt.trim()) return;

    // Append user message
    const userMsgId = `usr_${Date.now()}`;
    const newMsg: Message = {
      id: userMsgId,
      sender: "user",
      text: prompt,
      timestamp: new Date()
    };

    // Keep history of previous rounds to pass for followup query tracking
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setInputText("");
    setIsSending(true);

    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt, 
          history: updatedMessages.slice(-10) // pass latest 10 messages for conversation continuity
        })
      });
      const data = await response.json();

      if (data.success) {
        const assistantMsg: Message = {
          id: `ast_${Date.now()}`,
          sender: "assistant",
          text: data.explanation,
          timestamp: new Date(),
          draft: {
            userIntent: data.userIntent,
            amount: data.amount,
            bankCode: data.bankCode,
            bankName: data.bankName,
            accountNumber: data.accountNumber,
            accountName: data.accountName,
            phoneNumber: data.phoneNumber,
            providerId: data.providerId,
            providerName: data.providerName,
            packageName: data.packageName,
            networkName: data.networkName
          }
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            sender: "assistant",
            text: data.message || "I had difficulty matching your request. Could you re-phrase?",
            timestamp: new Date()
          }
        ]);
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: "assistant",
          text: "Broker offline: " + err.message,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const executeDraftTransaction = async (draft: any) => {
    if (!transactionPin || transactionPin.length !== 4) {
      triggerToast("PIN Required", "Please enter your 4-digit transaction authorization PIN.", "error");
      return;
    }

    setIsExecutingTx(true);
    setTxErrorMessage(null);
    setTxSuccessMessage(null);

    const isTransfer = draft.userIntent === "transfer";

    try {
      if (isTransfer) {
        const response = await fetch("/api/transfer/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bankCode: draft.bankCode,
            bankName: draft.bankName || "Commercial Bank",
            accountNumber: draft.accountNumber,
            recipientName: draft.accountName || "AI Voice Receiver",
            amount: draft.amount,
            narration: "AI Speech Dispatch",
            pin: transactionPin
          })
        });
        const data = await response.json();
        if (data.success) {
          setTxSuccessMessage(`Disbursed ₦${draft.amount.toLocaleString()} successfully to ${draft.accountName || draft.bankName || 'recipient'}.`);
          triggerToast("Disbursement Success", `Sent ₦${draft.amount} via AI Voice broker.`, "success");
          onRefreshAll();
          setTransactionPin("");
        } else {
          setTxErrorMessage(data.message || "Handshake rejected.");
        }
      } else if (draft.userIntent === "airtime" || draft.userIntent === "data") {
        // Airtime or Data Utility recharge
        const response = await fetch("/api/bills/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            billType: draft.userIntent,
            providerId: draft.providerId || "mtn",
            mobile: draft.phoneNumber,
            amount: draft.amount,
            pin: transactionPin
          })
        });
        const data = await response.json();
        if (data.success) {
          setTxSuccessMessage(`${draft.networkName || 'Airtime'} recharge of ₦${draft.amount.toLocaleString()} dispatched for ${draft.phoneNumber}`);
          triggerToast("Recharge Dispatched", "Airtime filled via voice command.", "success");
          onRefreshAll();
          setTransactionPin("");
        } else {
          setTxErrorMessage(data.message || "Billing gateway rejected payment.");
        }
      } else if (draft.userIntent === "utility_bills") {
        // Arbitrary Utilities (Electricity or Cable Decoder payments)
        const isCable = draft.providerId?.includes("dstv") || draft.providerId?.includes("gotv") || draft.providerId?.includes("startimes");
        const targetNumber = draft.phoneNumber || draft.accountNumber || "12345678901";
        const response = await fetch("/api/bills/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            billType: isCable ? "cable" : "electricity",
            providerId: draft.providerId || "ikeja",
            meterNumber: targetNumber,
            amount: draft.amount,
            billCode: draft.packageName || null,
            pin: transactionPin
          })
        });
        const data = await response.json();
        if (data.success) {
          setTxSuccessMessage(`Paid ₦${draft.amount.toLocaleString()} for ${draft.providerName || draft.providerId} (${targetNumber}).`);
          triggerToast("Bill Handled", "Payment updated successfully.", "success");
          onRefreshAll();
          setTransactionPin("");
        } else {
          setTxErrorMessage(data.message || "Utility provider dismissed payment.");
        }
      }
    } catch (err: any) {
      setTxErrorMessage("Gateway communication timeout: " + err.message);
    } finally {
      setIsExecutingTx(false);
    }
  };

  return (
    <>
      {/* Floating Activation Bubble */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-4.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl hover:scale-105 transition-all flex items-center gap-2 cursor-pointer no-print group"
        title="Open AI Speech transaction assistant"
      >
        <Sparkles className="w-5.5 h-5.5 animate-pulse" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-out font-bold text-xs">
          Talk to broker
        </span>
      </button>

      {/* Side drawer panel */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-slate-100 no-print animate-in slide-in-from-right duration-250">
          
          {/* Panel Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-display text-slate-800">AI Speech Broker</h3>
                <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></span>
                  Gemini Voice Transact
                </span>
              </div>
            </div>
            
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Guidance tags */}
          <div className="p-3 bg-indigo-50/50 border-b border-indigo-100/30 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap text-[10px] font-medium text-indigo-700 scrollbar-none">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="bg-white px-2 py-0.5 rounded-full border border-indigo-100 cursor-pointer" onClick={() => setInputText("What is my current balance?")}>Current Balance</span>
            <span className="bg-white px-2 py-0.5 rounded-full border border-indigo-100 cursor-pointer" onClick={() => setInputText("Send 2000 to Access Bank account 1022394018")}>Access Transfer</span>
            <span className="bg-white px-2 py-0.5 rounded-full border border-indigo-100 cursor-pointer" onClick={() => setInputText("Buy 500 NGN MTN Airtime for 08031234567")}>MTN Airtime</span>
          </div>

          {/* Message Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/30">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div 
                  className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                    msg.sender === "user" 
                      ? "bg-indigo-600 text-white rounded-br-none" 
                      : "bg-white border border-slate-100 text-slate-700 rounded-bl-none shadow-3xs"
                  }`}
                >
                  <p>{msg.text}</p>
                </div>

                {/* Embedded Transaction Confirmation widget */}
                {msg.sender === "assistant" && msg.draft && (msg.draft.userIntent === "transfer" || msg.draft.userIntent === "airtime" || msg.draft.userIntent === "data" || msg.draft.userIntent === "utility_bills") && msg.draft.amount && (
                  <div className="mt-2.5 bg-white border border-indigo-100 rounded-2xl p-4 shadow-sm w-[85%] space-y-3">
                    <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <Coins className="w-4 h-4 text-indigo-600" />
                      <span className="text-[10px] font-bold text-indigo-950 uppercase tracking-widest font-display">
                        AI Draft Transaction
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Dispatch Type:</span>
                        <span className="font-bold text-slate-800 uppercase">
                          {msg.draft.userIntent === "utility_bills" ? "utility/bill" : msg.draft.userIntent}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Draft Value:</span>
                        <span className="font-bold text-indigo-700">₦{msg.draft.amount.toLocaleString()}</span>
                      </div>
                      {msg.draft.userIntent === "transfer" ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Target Bank:</span>
                            <span className="font-bold text-slate-800">{msg.draft.bankName || msg.draft.bankCode}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">NUBAN Code:</span>
                            <span className="font-mono font-bold text-slate-800">{msg.draft.accountNumber}</span>
                          </div>
                          {msg.draft.accountName && (
                            <div className="flex justify-between bg-emerald-50/50 p-1 px-1.5 rounded-md mt-0.5 border border-emerald-100/40">
                              <span className="text-emerald-700 font-medium">Acct Name:</span>
                              <span className="font-mono font-bold text-emerald-800">{msg.draft.accountName}</span>
                            </div>
                          )}
                        </>
                      ) : msg.draft.userIntent === "utility_bills" ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Provider:</span>
                            <span className="font-bold text-slate-800">{msg.draft.providerName || msg.draft.providerId || "Utility bill"}</span>
                          </div>
                          {msg.draft.packageName && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Package:</span>
                              <span className="font-bold text-indigo-650">{msg.draft.packageName}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-slate-400">Meter / Card:</span>
                            <span className="font-mono font-bold text-slate-800">{msg.draft.phoneNumber || msg.draft.accountNumber}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Carrier:</span>
                            <span className="font-bold text-slate-800 uppercase">{msg.draft.networkName || msg.draft.providerId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Recipient Line:</span>
                            <span className="font-mono font-bold text-slate-800">{msg.draft.phoneNumber}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Sub-form to execute */}
                    {!txSuccessMessage ? (
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <input
                          type="password"
                          maxLength={4}
                          placeholder="Insert PIN to approve (default: 1234)"
                          value={transactionPin}
                          onChange={(e) => setTransactionPin(e.target.value.replace(/\D/g, ""))}
                          className="w-full h-8.5 px-3 text-center text-xs border border-slate-200 focus:border-indigo-400 rounded-lg font-mono tracking-widest"
                        />
                        
                        {txErrorMessage && (
                          <div className="p-1 px-2.5 bg-rose-50 text-rose-800 text-[10px] rounded-md font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                            <span>{txErrorMessage}</span>
                          </div>
                        )}

                        <button
                          onClick={() => executeDraftTransaction(msg.draft)}
                          disabled={isExecutingTx}
                          className="w-full h-8 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          {isExecutingTx ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Completing ledger clearing...
                            </>
                          ) : (
                            <>
                              Confirm Action
                              <ArrowRight className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="p-2 bg-emerald-50 text-emerald-800 text-[10px] rounded-xl font-bold flex items-start gap-1.5 border border-emerald-100">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{txSuccessMessage}</span>
                      </div>
                    )}
                  </div>
                )}

                <span className="text-[9px] text-slate-300 mt-1 font-mono">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            
            {isSending && (
              <div className="flex items-start gap-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                <span className="text-xs">Decoding transaction layers...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form / Speech Controls */}
          <div className="p-4 border-t border-slate-100 bg-white space-y-3">
            
            {isListening && (
              <div className="flex items-center justify-center gap-3 py-1 text-xs">
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-4 bg-indigo-600 animate-pulse rounded-full"></span>
                  <span className="w-1.5 h-5 bg-indigo-600 animate-pulse rounded-full delay-75"></span>
                  <span className="w-1.5 h-6 bg-indigo-600 animate-pulse rounded-full delay-150"></span>
                  <span className="w-1.5 h-4 bg-indigo-600 animate-pulse rounded-full delay-200"></span>
                </div>
                <span className="text-indigo-600 font-bold font-mono text-[10px] uppercase tracking-wider animate-pulse">
                  Listening to your voice... Speak now
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleListening}
                className={`p-3 rounded-xl cursor-pointer shadow-3xs transition-all relative ${
                  isListening 
                    ? "bg-rose-500 text-white animate-bounce shrink-0" 
                    : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 shrink-0"
                }`}
                title={isListening ? "Cancel recording" : "Activate speech capture"}
              >
                {isListening ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>

              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendPrompt(); }}
                className="flex-1 flex items-center relative"
              >
                <input
                  type="text"
                  placeholder="Ask or type commands..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="w-full h-11 pl-4.5 pr-11 bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white rounded-xl text-xs focus:outline-hidden text-slate-800"
                />
                
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="absolute right-2 top-1.5 p-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-lg cursor-pointer transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
            
            <p className="text-[9px] text-center text-slate-400">
              Web Speech API translates voice to text locally while securing sensitive customer pin codes.
            </p>
          </div>

        </div>
      )}
    </>
  );
}
