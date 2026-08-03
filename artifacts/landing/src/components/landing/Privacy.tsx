import { motion } from "framer-motion";
import { LockKeyhole, ShieldAlert, Undo2, KeyRound } from "lucide-react";

export function Privacy() {
  return (
    <section id="privacy" className="py-24 relative text-white" style={{ background: "linear-gradient(135deg, #1E1035 0%, #2D1B6E 50%, #1a1035 100%)" }}>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_60%,transparent_100%)]"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-full mb-6">
            <LockKeyhole className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-4xl md:text-5xl mb-6 font-serif">Yours, always.</h2>
          <p className="text-lg text-white/70">
            We only hold your data when it keeps you safe. The moment you're okay, it comes back to you — yours to keep or erase. The one exception: if you go quiet and never confirm you're safe, we already have what we need to speak for you and reach your circle.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            {
              icon: <ShieldAlert className="w-6 h-6" />,
              title: "Held only at risk",
              desc: "Your details are captured only while you're in an active situation — a date, a walk home, a late-night ride. Never as background surveillance of your daily life."
            },
            {
              icon: <Undo2 className="w-6 h-6" />,
              title: "Released when you're safe",
              desc: "Check in as okay and everything we held is handed straight back to you — yours to keep or wipe for good, on your terms."
            },
            {
              icon: <KeyRound className="w-6 h-6" />,
              title: "Yours unless you go silent",
              desc: "You own every byte. We only act on it — speaking for you and alerting your Trusted Crew — if you don't tell us and them that you're safe."
            }
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm"
            >
              <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary mb-6">
                {item.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">{item.title}</h3>
              <p className="text-white/60 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
