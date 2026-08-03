import { motion } from "framer-motion";
import { Heart, Map, Smartphone, Phone, X } from "lucide-react";

const comparisons = [
  {
    icon: <Heart className="w-5 h-5" />,
    label: "Dating apps",
    description: "Introduce you to someone. Then they're done. No safety features, no check-ins, no way to verify who you're actually meeting.",
    color: "text-rose-400",
    bg: "bg-rose-400/10",
  },
  {
    icon: <Smartphone className="w-5 h-5" />,
    label: "Social apps",
    description: "Built to keep you engaged, not to keep you safe. They have no concept of a real-world meetup going wrong.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: <Map className="w-5 h-5" />,
    label: "Maps & navigation",
    description: "Tell you how to get there. They don't know you arrived, who you met, or if you made it home.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    icon: <Phone className="w-5 h-5" />,
    label: "Your phone",
    description: "Can dial 911 — if you can get to it, unlock it, and make the call. That's a lot of steps when you're scared.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
];

export function WhyItMatters() {
  return (
    <section id="why-it-matters" className="py-24 bg-white relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            Why LoopIn
          </div>
          <h2 className="text-4xl md:text-5xl mb-6">
            Every other app stops <br />
            <span className="text-gradient">at the introduction.</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Dating apps, social platforms, maps, and your phone were all built before "meeting strangers from the internet" was something billions of people do every week. None of them were designed for what happens after you say yes.
          </p>
        </div>

        {/* Comparison grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
          {comparisons.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="flex gap-4 p-6 rounded-2xl border border-border/60 bg-muted/20 hover:bg-white hover:shadow-md transition-all"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.bg} ${item.color}`}>
                {item.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-foreground">{item.label}</p>
                  <X className="w-3.5 h-3.5 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground font-medium">no safety layer</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Closing argument */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto rounded-3xl p-10 text-center"
          style={{ background: "linear-gradient(135deg, #1E1035 0%, #2D1B6E 100%)" }}
        >
          <p className="text-2xl md:text-3xl text-white font-serif leading-snug mb-4">
            "LoopIn doesn't replace the people you're meeting. It replaces the gap between the swipe and getting home safe."
          </p>
          <p className="text-white/50 text-sm">
            That gap — the date, the walk, the ride, the shift, the campus night — is exactly what LoopIn is built for.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
