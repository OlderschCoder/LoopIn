import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Phone,
  PhoneCall,
  PhoneMissed,
  Send,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Shield,
  Zap,
  Lock,
  Mic,
  Navigation,
  Heart,
  Calendar,
  AlertOctagon,
  Settings,
  UserPlus,
} from "lucide-react";

// ── brand colours (mirrors constants/colors.ts) ────────────────────────────
const C = {
  bg: "#E9E8F1",
  card: "#FFFFFF",
  primary: "#7C3AED",
  primaryFg: "#FFFFFF",
  safe: "#10B981",
  safeFg: "#FFFFFF",
  sos: "#F43F5E",
  sosLight: "#FFF1F3",
  foreground: "#0E0A1E",
  muted: "#6E6589",
  border: "#E6E1F5",
  surface: "#EEEAF9",
};

// ── fake data ──────────────────────────────────────────────────────────────
const THREADS = [
  { id: 1, name: "Jake (Hinge)", number: "(917) 555-0182", preview: "See you Saturday! 😊", time: "2:18 PM", unread: 0, avatar: "J", color: "#2D6CE2", platform: "Hinge" },
  { id: 2, name: "Ryan (Bumble)", number: "(646) 555-0341", preview: "📷 Photo", time: "11:42 AM", unread: 2, avatar: "R", color: "#F59E0B", platform: "Bumble" },
  { id: 3, name: "(213) 555-0087", number: "(213) 555-0087", preview: "Hey, are you free this week?", time: "Yesterday", unread: 0, avatar: "#", color: "#10B981", platform: null },
];

const MESSAGES = [
  { id: 1, out: false, text: "Hey! Are we still on for Saturday? 😊", time: "2:14 PM" },
  { id: 2, out: true,  text: "Yes! Looking forward to it 🙌", time: "2:17 PM" },
  { id: 3, out: false, text: "Great, I'll call you to confirm the time", time: "2:18 PM" },
  { id: 4, out: true,  text: "Sounds good 👍", time: "2:19 PM" },
];

// ── screens ────────────────────────────────────────────────────────────────
function HomeScreen() {
  const FEATURES = [
    { icon: Zap,          label: "Virtual BFF",   sub: "Red flags",      color: C.primary },
    { icon: Calendar,     label: "Check-Ins",     sub: "Auto-alerts",    color: "#6D28D9" },
    { icon: Phone,        label: "Fake Call",     sub: "Quick exit",     color: "#0369A1" },
    { icon: Mic,          label: "Record",        sub: "Private audio",  color: "#0891B2" },
    { icon: Lock,         label: "Safety Vault",  sub: "Private notes",  color: "#059669" },
    { icon: Heart,        label: "Reflect",       sub: "Track patterns", color: "#D97706" },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: C.bg, gap: 10, padding: "12px 12px 8px" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Good evening</p>
          <p style={{ fontSize: 15, fontWeight: 800, color: C.foreground, lineHeight: 1.2 }}>LoopIn</p>
        </div>
        <div className="flex gap-1.5">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <Settings size={13} color={C.muted} />
          </div>
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: C.sosLight, border: `1px solid ${C.sos}30` }}>
            <span style={{ fontSize: 7, fontWeight: 800, color: C.sos }}>SOS</span>
          </div>
        </div>
      </div>

      {/* Safety Circle card — dark gradient */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "linear-gradient(135deg, #1E1035 0%, #3B1F6D 100%)" }}
      >
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 6 }}>
          YOUR SAFETY CIRCLE
        </p>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#FFFFFF", marginBottom: 6 }}>
          2 people watching over you
        </p>
        {/* Avatars */}
        <div className="flex gap-1.5 mb-3">
          {["S", "M"].map((l) => (
            <div key={l} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.12)" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#FFFFFF" }}>{l}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Start a check-in before your next date</p>
      </div>

      {/* Hero action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl p-3 flex flex-col gap-1" style={{ background: C.primary }}>
          <Shield size={16} color="rgba(255,255,255,0.85)" />
          <p style={{ fontSize: 11, fontWeight: 700, color: "#FFFFFF", marginTop: 4 }}>Start Check-In</p>
          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.7)" }}>GPS + auto-alerts</p>
        </div>
        <div className="rounded-2xl p-3 flex flex-col gap-1" style={{ background: C.safe }}>
          <Home size={16} color="rgba(255,255,255,0.85)" />
          <p style={{ fontSize: 11, fontWeight: 700, color: "#FFFFFF", marginTop: 4 }}>I'm Home Safe</p>
          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.7)" }}>Let circle know</p>
        </div>
      </div>

      {/* Walk Me Home */}
      <div className="rounded-2xl flex items-center gap-3 px-3 py-2.5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: C.surface }}>
          <Navigation size={14} color={C.primary} />
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 11, fontWeight: 700, color: C.foreground }}>Walk Me Home</p>
          <p style={{ fontSize: 9, color: C.muted, marginTop: 1 }}>Auto-alerts if you don't check in</p>
        </div>
        <ChevronRight size={14} color={C.muted} />
      </div>

      {/* Emergency SOS */}
      <div className="rounded-2xl flex items-center gap-3 px-3 py-2.5" style={{ background: C.sosLight, border: `1px solid ${C.sos}30` }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${C.sos}15` }}>
          <AlertOctagon size={14} color={C.sos} />
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 11, fontWeight: 700, color: C.sos }}>Emergency SOS</p>
          <p style={{ fontSize: 9, color: `${C.sos}99`, marginTop: 1 }}>Alert circle &amp; call for help</p>
        </div>
        <ChevronRight size={14} color={`${C.sos}80`} />
      </div>

      {/* Tools grid */}
      <p style={{ fontSize: 11, fontWeight: 700, color: C.foreground, marginTop: 2 }}>Tools</p>
      <div className="grid grid-cols-3 gap-2 pb-2">
        {FEATURES.map(({ icon: Icon, label, sub, color }) => (
          <div key={label} className="rounded-2xl p-2.5 flex flex-col gap-1" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: color + "15" }}>
              <Icon size={13} color={color} />
            </div>
            <p style={{ fontSize: 9, fontWeight: 700, color: C.foreground, marginTop: 2, lineHeight: 1.2 }}>{label}</p>
            <p style={{ fontSize: 8, color: C.muted }}>{sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhoneScreen({ onOpen }: { onOpen: (id: number) => void }) {
  return (
    <div className="flex flex-col h-full" style={{ background: C.bg }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3" style={{ background: C.card, borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between">
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: C.foreground }}>Private Line</p>
            <p style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>+1 (866) 706-5127</p>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: "#D1FAE5" }}>
            <PhoneCall size={11} color={C.safe} />
            <span style={{ fontSize: 9, fontWeight: 700, color: C.safe }}>Calls</span>
          </div>
        </div>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto" style={{ background: C.card }}>
        {THREADS.map((t, i) => (
          <button
            key={t.id}
            onClick={() => onOpen(t.id)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
            style={{
              borderBottom: i < THREADS.length - 1 ? `1px solid ${C.border}` : "none",
              background: "transparent",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = C.surface)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
              style={{ background: t.color + "18", color: t.color }}
            >
              {t.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p style={{ fontSize: 12, fontWeight: 700, color: C.foreground }} className="truncate">{t.name}</p>
                <p style={{ fontSize: 9, color: C.muted, flexShrink: 0, marginLeft: 6 }}>{t.time}</p>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {t.platform && (
                  <span
                    className="rounded-full px-1.5 py-0.5"
                    style={{ fontSize: 8, fontWeight: 700, color: t.color, background: t.color + "18" }}
                  >
                    {t.platform}
                  </span>
                )}
                <p style={{ fontSize: 10, color: C.muted }} className="truncate">{t.preview}</p>
              </div>
            </div>
            {t.unread > 0 && (
              <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: C.primary }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: "#FFFFFF" }}>{t.unread}</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* FAB */}
      <div
        className="absolute bottom-16 right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
        style={{ background: C.primary }}
      >
        <svg className="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </div>
    </div>
  );
}

function ConversationScreen({ threadId, onBack }: { threadId: number; onBack: () => void }) {
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState(MESSAGES);
  const thread = THREADS.find((t) => t.id === threadId) ?? THREADS[0];

  function send() {
    if (!text.trim()) return;
    setMsgs((m) => [...m, { id: Date.now(), out: true, text: text.trim(), time: "now" }]);
    setText("");
  }

  return (
    <div className="flex flex-col h-full" style={{ background: C.card }}>
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 pt-4 pb-3"
        style={{ background: C.card, borderBottom: `1px solid ${C.border}` }}
      >
        <button onClick={onBack} style={{ color: C.primary, flexShrink: 0 }}>
          <ChevronLeft size={20} />
        </button>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
          style={{ background: thread.color + "18", color: thread.color }}
        >
          {thread.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 12, fontWeight: 700, color: C.foreground }}>{thread.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p style={{ fontSize: 9, color: C.muted }}>{thread.number}</p>
            {thread.platform && (
              <span
                className="rounded-full px-1.5 py-0.5 cursor-pointer"
                style={{ fontSize: 8, fontWeight: 700, color: thread.color, background: thread.color + "18" }}
              >
                {thread.platform} profile →
              </span>
            )}
          </div>
        </div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.surface }}>
          <Phone size={14} color={C.primary} />
        </div>
      </div>

      {/* Safety pill */}
      <div className="mx-3 mt-2 flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: C.surface }}>
        <Shield size={11} color={C.primary} style={{ flexShrink: 0 }} />
        <p style={{ fontSize: 9, color: C.primary, fontWeight: 600 }}>Your real number is hidden · saved to vault</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.out ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[76%] rounded-2xl px-3 py-2"
              style={{ background: m.out ? C.primary : C.surface, color: m.out ? "#FFFFFF" : C.foreground }}
            >
              <p style={{ fontSize: 11, lineHeight: 1.4 }}>{m.text}</p>
              <p style={{ fontSize: 9, marginTop: 3, color: m.out ? "rgba(255,255,255,0.55)" : C.muted }}>{m.time}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input bar */}
      <div className="px-3 pb-2 pt-2 flex items-center gap-2" style={{ borderTop: `1px solid ${C.border}` }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: C.surface }}>
          <ImageIcon size={13} color={C.muted} />
        </div>
        <div className="flex-1 rounded-full px-3 py-1.5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="iMessage"
            style={{ width: "100%", fontSize: 11, background: "transparent", outline: "none", color: C.foreground }}
            className="placeholder:text-[#9ca3af]"
          />
        </div>
        <button
          onClick={send}
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
          style={{ background: text.trim() ? C.primary : C.border }}
        >
          <Send size={12} color="#FFFFFF" />
        </button>
      </div>
    </div>
  );
}

// ── tab bar ────────────────────────────────────────────────────────────────
type Tab = "home" | "ai" | "phone" | "plan" | "reflect" | "locker";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "home",    label: "Home",    icon: Home },
  { id: "ai",      label: "AI",      icon: Zap },
  { id: "phone",   label: "Phone",   icon: Phone },
  { id: "plan",    label: "Plan",    icon: Calendar },
  { id: "reflect", label: "Reflect", icon: Heart },
  { id: "locker",  label: "Vault",   icon: Lock },
];

// ── main export ────────────────────────────────────────────────────────────
export function PhoneMockup() {
  const [tab, setTab] = useState<Tab>("phone");
  const [openThread, setOpenThread] = useState<number | null>(null);

  function getContent() {
    if (tab === "home") return <HomeScreen />;
    if (tab !== "phone") {
      // placeholder for AI / Plan / Reflect / Locker tabs
      const info: Record<string, { icon: React.ElementType; title: string; sub: string }> = {
        ai:      { icon: Zap,      title: "Virtual BFF",    sub: "Ask anything, get safety advice" },
        plan:    { icon: Calendar, title: "Check-Ins",      sub: "Set a plan, auto-alert if missed" },
        reflect: { icon: Heart,    title: "Reflect",        sub: "Track patterns & how you felt" },
        locker:  { icon: Lock,     title: "Safety Vault",   sub: "Private notes & recordings" },
      };
      const { icon: Icon, title, sub } = info[tab];
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 px-6" style={{ background: C.bg }}>
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: C.surface }}>
            <Icon size={28} color={C.primary} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 800, color: C.foreground, textAlign: "center" }}>{title}</p>
          <p style={{ fontSize: 12, color: C.muted, textAlign: "center", lineHeight: 1.5 }}>{sub}</p>
        </div>
      );
    }
    if (openThread !== null) {
      return <ConversationScreen threadId={openThread} onBack={() => setOpenThread(null)} />;
    }
    return <PhoneScreen onOpen={(id) => setOpenThread(id)} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="w-full max-w-[300px] mx-auto"
    >
      {/* Phone frame */}
      <div className="relative bg-[#1a1a2e] rounded-[44px] p-[10px] shadow-2xl ring-1 ring-white/10">
        {/* Dynamic island */}
        <div className="absolute top-[18px] left-1/2 -translate-x-1/2 w-24 h-7 bg-black rounded-full z-20 flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#111] ring-1 ring-[#333]" />
          <div className="w-4 h-4 rounded-full bg-[#111] ring-1 ring-[#333]" />
        </div>

        {/* Screen */}
        <div className="relative rounded-[36px] overflow-hidden" style={{ height: 580, background: C.bg }}>
          {/* Status bar */}
          <div
            className="h-10 flex items-end justify-between px-6 pb-1 relative z-10"
            style={{ background: tab === "phone" ? C.card : C.bg }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: C.foreground }}>9:41</span>
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5 items-end">
                {[3, 5, 7, 7].map((h, i) => (
                  <div key={i} style={{ width: 3, height: h, background: C.foreground, borderRadius: 2 }} />
                ))}
              </div>
              <svg width="14" height="10" viewBox="0 0 24 24" fill="none" stroke={C.foreground} strokeWidth="2" strokeLinecap="round">
                <path d="M1.5 8.5a13 13 0 0121 0M5 12a10 10 0 0114 0M8.5 15.5a6 6 0 017 0M12 19h.01" />
              </svg>
              <div className="flex items-center">
                <div
                  className="rounded-sm flex items-center p-0.5"
                  style={{ width: 22, height: 11, border: `1.5px solid ${C.foreground}` }}
                >
                  <div style={{ width: "68%", height: "100%", background: C.foreground, borderRadius: 1 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Screen content */}
          <div className="absolute inset-0 top-10 bottom-[52px] overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab + (openThread ?? "")}
                initial={{ opacity: 0, x: openThread !== null && tab === "phone" ? 18 : 0 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="h-full"
              >
                {getContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Tab bar — 6 tabs matching the actual app */}
          <div
            className="absolute bottom-0 left-0 right-0 flex items-center justify-around"
            style={{
              height: 52,
              background: "rgba(233,232,241,0.96)",
              backdropFilter: "blur(12px)",
              borderTop: `1px solid ${C.border}`,
            }}
          >
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => { setTab(id); setOpenThread(null); }}
                  className="flex flex-col items-center gap-0.5 flex-1 py-1 transition-all"
                >
                  <Icon
                    size={18}
                    color={active ? C.primary : C.muted}
                    strokeWidth={active ? 2.5 : 1.8}
                  />
                  <span
                    style={{
                      fontSize: 8,
                      fontWeight: active ? 700 : 500,
                      color: active ? C.primary : C.muted,
                    }}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-4">
        Tap tabs or threads to explore
      </p>
    </motion.div>
  );
}
