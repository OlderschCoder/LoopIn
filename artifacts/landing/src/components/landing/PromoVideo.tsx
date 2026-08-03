import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Zap, MapPin, PhoneCall, CheckCircle, AlertTriangle } from "lucide-react";

const STEPS = [
  {
    id: "analyze",
    label: "01 · Analyze",
    icon: Zap,
    color: "#7C3AED",
    title: "AI scans for red flags",
    subtitle: "Before you even say yes to a date",
    screen: (
      <div className="flex flex-col gap-3 p-4 h-full" style={{ background: "#E9E8F1" }}>
        <div className="rounded-2xl p-4 bg-white border border-[#E6E1F5] shadow-sm">
          <p className="text-[10px] font-bold text-[#6E6589] uppercase tracking-wide mb-2">Profile Analysis</p>
          <p className="text-xs text-[#0E0A1E] font-semibold mb-3">Jake · Hinge · 3 days ago</p>
          <div className="space-y-2">
            {[
              { label: "Communication style", score: 82, color: "#10B981" },
              { label: "Consistency", score: 91, color: "#10B981" },
              { label: "Pressure patterns", score: 12, color: "#F59E0B" },
            ].map(({ label, score, color }) => (
              <div key={label}>
                <div className="flex justify-between mb-0.5">
                  <span className="text-[9px] text-[#6E6589]">{label}</span>
                  <span className="text-[9px] font-bold" style={{ color }}>{score}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#EEEAF9] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="h-full rounded-full"
                    style={{ background: color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ background: "#D1FAE5" }}>
          <CheckCircle size={14} color="#10B981" />
          <p className="text-[10px] font-semibold text-[#065F46]">Looks good — green flags overall ✓</p>
        </div>
      </div>
    ),
  },
  {
    id: "plan",
    label: "02 · Plan",
    icon: Shield,
    color: "#6D28D9",
    title: "Build your safety net",
    subtitle: "Set check-ins before you leave",
    screen: (
      <div className="flex flex-col gap-3 p-4 h-full" style={{ background: "#E9E8F1" }}>
        <div className="rounded-2xl p-4 bg-white border border-[#E6E1F5] shadow-sm">
          <p className="text-[10px] font-bold text-[#6E6589] uppercase tracking-wide mb-2">Date Plan</p>
          <p className="text-xs text-[#0E0A1E] font-semibold">Coffee with Jake</p>
          <p className="text-[9px] text-[#6E6589] mb-3">Blue Bottle · Tonight 7 PM</p>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-2 rounded-full bg-[#EEEAF9] overflow-hidden">
              <div className="h-full w-[82%] rounded-full bg-[#10B981]" />
            </div>
            <span className="text-[9px] font-bold text-[#10B981]">82 / 100</span>
          </div>
          <p className="text-[9px] text-[#6E6589]">Safety score · Public venue, daytime, transit nearby</p>
        </div>
        <div className="rounded-xl px-3 py-2.5 bg-white border border-[#E6E1F5] flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-[#7C3AED]/10 flex items-center justify-center">
            <span className="text-[9px] font-bold text-[#7C3AED]">S</span>
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-semibold text-[#0E0A1E]">Sarah (sister)</p>
            <p className="text-[9px] text-[#6E6589]">Check-in every 45 min</p>
          </div>
          <CheckCircle size={12} color="#10B981" />
        </div>
        <motion.div
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="rounded-xl px-3 py-2.5 flex items-center gap-2"
          style={{ background: "#7C3AED" }}
        >
          <Shield size={13} color="white" />
          <p className="text-[10px] font-bold text-white">Start check-in · 7:00 PM</p>
        </motion.div>
      </div>
    ),
  },
  {
    id: "checkin",
    label: "03 · Date",
    icon: MapPin,
    color: "#0891B2",
    title: "Gentle check-ins during your date",
    subtitle: "Miss one and your circle is alerted",
    screen: (
      <div className="flex flex-col gap-3 p-4 h-full" style={{ background: "#E9E8F1" }}>
        <div className="rounded-2xl p-4 bg-white border border-[#E6E1F5] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-[#6E6589] uppercase tracking-wide">Active Check-In</p>
            <span className="text-[9px] bg-[#D1FAE5] text-[#065F46] font-bold px-2 py-0.5 rounded-full">Live</span>
          </div>
          <p className="text-xs text-[#0E0A1E] font-semibold mb-1">Coffee with Jake</p>
          <p className="text-[9px] text-[#6E6589] mb-3">Blue Bottle Coffee · 7:14 PM</p>
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={10} color="#0891B2" />
            <p className="text-[9px] text-[#0891B2] font-medium">Location shared with Sarah</p>
          </div>
        </div>
        <motion.div
          animate={{ opacity: [0.9, 1, 0.9], boxShadow: ["0 0 0 0px rgba(124,58,237,0.2)", "0 0 0 6px rgba(124,58,237,0.1)", "0 0 0 0px rgba(124,58,237,0.2)"] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          className="rounded-2xl p-4 flex flex-col items-center gap-2"
          style={{ background: "#7C3AED" }}
        >
          <Shield size={20} color="white" />
          <p className="text-[11px] font-bold text-white">Next check-in in 31 min</p>
          <p className="text-[9px] text-white/70">Tap to confirm you're safe</p>
        </motion.div>
        <div className="rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ background: "#FFF1F3", border: "1px solid rgba(244,63,94,0.2)" }}>
          <AlertTriangle size={12} color="#F43F5E" />
          <p className="text-[9px] font-semibold text-[#F43F5E]">SOS · Alert circle instantly</p>
        </div>
      </div>
    ),
  },
  {
    id: "private",
    label: "04 · Private Line",
    icon: PhoneCall,
    color: "#059669",
    title: "Call without sharing your number",
    subtitle: "Real number always hidden",
    screen: (
      <div className="flex flex-col h-full" style={{ background: "#FFFFFF" }}>
        <div className="px-4 pt-4 pb-3 border-b border-[#E6E1F5]">
          <p className="text-xs font-bold text-[#0E0A1E]">Jake (Hinge)</p>
          <p className="text-[9px] text-[#6E6589]">(917) 555-0182 · via private line</p>
        </div>
        <div className="flex-1 flex flex-col gap-2 p-3 overflow-hidden">
          {[
            { out: false, text: "Hey! Are we still on for Saturday? 😊" },
            { out: true, text: "Yes! Looking forward to it 🙌" },
            { out: false, text: "I'll call you to confirm the time" },
            { out: true, text: "Sounds good 👍" },
          ].map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              className={`flex ${m.out ? "justify-end" : "justify-start"}`}
            >
              <div
                className="max-w-[78%] rounded-2xl px-3 py-2"
                style={{ background: m.out ? "#7C3AED" : "#EEEAF9" }}
              >
                <p style={{ fontSize: 10, color: m.out ? "#FFFFFF" : "#0E0A1E", lineHeight: 1.4 }}>{m.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="px-3 pb-3 pt-2 flex items-center gap-2 border-t border-[#E6E1F5]">
          <div className="flex-1 rounded-full px-3 py-1.5 bg-[#EEEAF9] border border-[#E6E1F5]">
            <p style={{ fontSize: 10, color: "#9CA3AF" }}>Message...</p>
          </div>
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#7C3AED" }}>
            <CheckCircle size={12} color="white" />
          </div>
        </div>
        <div className="mx-3 mb-3 flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: "#EEEAF9" }}>
          <Shield size={10} color="#7C3AED" />
          <p style={{ fontSize: 9, color: "#7C3AED", fontWeight: 600 }}>Real number hidden · conversation saved to vault</p>
        </div>
      </div>
    ),
  },
];

const INTERVAL = 3200;

export function PromoVideo() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % STEPS.length), INTERVAL);
    return () => clearInterval(id);
  }, []);

  const step = STEPS[active];

  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Step pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === active;
          return (
            <button
              key={s.id}
              onClick={() => setActive(i)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300"
              style={{
                background: isActive ? s.color : "transparent",
                color: isActive ? "#FFFFFF" : "#6E6589",
                border: `1.5px solid ${isActive ? s.color : "#E6E1F5"}`,
              }}
            >
              <Icon size={11} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Phone frame */}
      <div className="relative bg-[#1a1a2e] rounded-[44px] p-[10px] shadow-2xl ring-1 ring-white/10 mx-auto max-w-[260px]">
        {/* Dynamic island */}
        <div className="absolute top-[18px] left-1/2 -translate-x-1/2 w-20 h-6 bg-black rounded-full z-20" />

        {/* Screen */}
        <div className="relative rounded-[36px] overflow-hidden bg-[#E9E8F1]" style={{ height: 520 }}>
          {/* Status bar */}
          <div className="h-9 flex items-end justify-between px-5 pb-1 relative z-10 bg-[#E9E8F1]">
            <span style={{ fontSize: 9, fontWeight: 700, color: "#0E0A1E" }}>9:41</span>
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5 items-end">
                {[3, 5, 7, 7].map((h, i) => (
                  <div key={i} style={{ width: 2, height: h, background: "#0E0A1E", borderRadius: 2 }} />
                ))}
              </div>
              <div className="rounded-sm" style={{ width: 18, height: 9, border: "1.5px solid #0E0A1E", padding: 1 }}>
                <div style={{ width: "65%", height: "100%", background: "#0E0A1E", borderRadius: 1 }} />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="absolute inset-0 top-9 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
                className="h-full"
              >
                {step.screen}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Caption */}
      <div className="text-center mt-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="font-semibold text-foreground">{step.title}</p>
            <p className="text-sm text-muted-foreground mt-1">{step.subtitle}</p>
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-4">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="transition-all duration-300 rounded-full"
              style={{
                width: i === active ? 24 : 6,
                height: 6,
                background: i === active ? step.color : "#E6E1F5",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
