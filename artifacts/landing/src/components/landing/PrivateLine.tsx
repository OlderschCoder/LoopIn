import { motion } from "framer-motion";
import { PhoneCall, MessageSquare, Mic, EyeOff, Archive, ShieldCheck } from "lucide-react";

const bullets = [
  {
    icon: <EyeOff className="w-5 h-5 text-primary" />,
    title: "Your real number stays hidden",
    desc: "Matches only ever see your private LoopIn number — not your personal one.",
  },
  {
    icon: <MessageSquare className="w-5 h-5 text-primary" />,
    title: "Text from inside the app",
    desc: "Send and receive messages directly in LoopIn. Every thread is organized by contact.",
  },
  {
    icon: <PhoneCall className="w-5 h-5 text-primary" />,
    title: "Masked outbound calls",
    desc: "Call anyone through your private line. They see the LoopIn number, never yours.",
  },
  {
    icon: <Mic className="w-5 h-5 text-primary" />,
    title: "Calls recorded for safety",
    desc: "Every call is recorded with a consent notice. Play back recordings anytime from your vault.",
  },
  {
    icon: <Archive className="w-5 h-5 text-primary" />,
    title: "All saved to your vault",
    desc: "Texts and call logs are stored privately in your Safety Vault — always accessible, always yours.",
  },
  {
    icon: <ShieldCheck className="w-5 h-5 text-primary" />,
    title: "Stop contact instantly",
    desc: "Release your private number at any time. Contacts lose the ability to reach you with zero drama.",
  },
];

export function PrivateLine() {
  return (
    <section id="private-line" className="py-24 bg-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <PhoneCall className="w-4 h-4" />
              Private Line
            </div>
            <h2 className="text-4xl md:text-5xl mb-6">
              Text &amp; call anyone. <br />
              <span className="text-gradient">Your real number? Never shared.</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              LoopIn gives you a dedicated private phone number. Use it to text and call
              anyone — matches, ride drivers, sellers, whoever — and reclaim your number the moment you're done.
            </p>
          </motion.div>
        </div>

        {/* Two-column layout: visual left, bullets right */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Visual card */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="bg-white rounded-3xl shadow-2xl border border-border/50 overflow-hidden">
              {/* Mock phone header */}
              <div className="bg-primary px-6 py-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <PhoneCall className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Private line</p>
                  <p className="text-white/70 text-xs">+1 (866) 706-5127</p>
                </div>
                <div className="ml-auto">
                  <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full font-medium">Active</span>
                </div>
              </div>

              {/* Mock messages */}
              <div className="p-6 space-y-4 bg-muted/20">
                {/* Incoming */}
                <div className="flex gap-3 items-end">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground flex-shrink-0">J</div>
                  <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 max-w-[75%] shadow-sm border border-border/50">
                    <p className="text-sm text-foreground">Hey! Are we still on for Saturday? 😊</p>
                    <p className="text-xs text-muted-foreground mt-1">Jake · 2:14 PM</p>
                  </div>
                </div>
                {/* Outgoing */}
                <div className="flex gap-3 items-end justify-end">
                  <div className="bg-primary rounded-2xl rounded-br-sm px-4 py-3 max-w-[75%] shadow-sm shadow-primary/20">
                    <p className="text-sm text-white">Yes! Looking forward to it 🙌</p>
                    <p className="text-xs text-white/60 mt-1">You · 2:17 PM</p>
                  </div>
                </div>
                {/* Incoming */}
                <div className="flex gap-3 items-end">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground flex-shrink-0">J</div>
                  <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 max-w-[75%] shadow-sm border border-border/50">
                    <p className="text-sm text-foreground">Great, I'll call you to confirm the time</p>
                    <p className="text-xs text-muted-foreground mt-1">Jake · 2:18 PM</p>
                  </div>
                </div>
              </div>

              {/* Privacy badge */}
              <div className="px-6 py-4 border-t border-border/40 flex items-center gap-3 bg-white">
                <ShieldCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Your real number is hidden. Conversation saved to vault.
                </p>
              </div>
            </div>

            {/* Floating call pill */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="absolute -bottom-6 -right-6 bg-white rounded-2xl px-4 py-3 shadow-xl border border-border/50 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <Mic className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Call recorded</p>
                <p className="text-xs text-muted-foreground">Saved to Safety Vault</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Bullet list */}
          <div className="space-y-5">
            {bullets.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="flex gap-4 items-start p-5 rounded-2xl bg-white border border-border/50 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {b.icon}
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">{b.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
