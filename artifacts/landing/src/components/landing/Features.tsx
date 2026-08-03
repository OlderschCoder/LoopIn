import { motion } from "framer-motion";
import { Brain, PhoneCall, Lock, Clock, Footprints, Users, Siren, FileText, PhoneIncoming } from "lucide-react";

const features = [
  {
    icon: <Brain className="w-6 h-6 text-primary" />,
    name: "Virtual BFF",
    title: "Virtual BFF",
    description: "Paste a profile or chat before you meet. The AI instantly surfaces red flags, inconsistencies, and pushy patterns — with a plain red/yellow/green breakdown. Available 24/7 as your conversational safety coach."
  },
  {
    icon: <PhoneCall className="w-6 h-6 text-primary" />,
    name: "Private Line",
    title: "Private Line",
    description: "Text and call anyone from a dedicated masked number. Matches only ever see your LoopIn number — your real number stays hidden forever. Stop contact instantly, with zero drama.",
    highlight: true,
  },
  {
    icon: <Lock className="w-6 h-6 text-primary" />,
    name: "Safety Vault",
    title: "Safety Vault",
    description: "A secure, device-only vault for screenshots, voice notes, recordings, and anything you want saved. Nothing leaves your device without your explicit action."
  },
  {
    icon: <Clock className="w-6 h-6 text-primary" />,
    name: "Check-Ins",
    title: "Check-Ins",
    description: "Set scheduled check-in times for any situation. Miss one and your Trusted Crew is automatically alerted with your last known location — no fumbling required."
  },
  {
    icon: <Footprints className="w-6 h-6 text-primary" />,
    name: "Walk With Me",
    title: "Walk With Me",
    description: "Start a countdown on your walk home, to the car, or across campus. If it isn't cancelled in time, your circle is notified with your location automatically."
  },
  {
    icon: <Users className="w-6 h-6 text-primary" />,
    name: "Trusted Crew",
    title: "Trusted Crew",
    description: "Choose the people who get looped in when something goes wrong — friends, family, a roommate. They receive alerts, location, and plan details only when it matters."
  },
  {
    icon: <Siren className="w-6 h-6 text-primary" />,
    name: "Emergency Loop",
    title: "Emergency Loop",
    description: "One button calls 911, texts your Trusted Crew with your location, and walks you through a calming breathing exercise. Everything you need, instantly, from the home screen."
  },
  {
    icon: <FileText className="w-6 h-6 text-primary" />,
    name: "Evidence Timeline",
    title: "Evidence Timeline",
    description: "A timestamped, searchable log of check-ins, locations, notes, and events — built automatically as you use LoopIn. Your record, ready if you ever need it."
  },
  {
    icon: <PhoneIncoming className="w-6 h-6 text-primary" />,
    name: "Fake Call Escape",
    title: "Fake Call Escape",
    description: "Schedule a realistic incoming call to give yourself a graceful, no-questions-asked exit from any situation that feels off."
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 bg-white relative">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            What LoopIn Does
          </div>
          <h2 className="text-4xl md:text-5xl mb-6">Nine tools. <br/>One <span className="text-gradient">safety layer</span>.</h2>
          <p className="text-lg text-muted-foreground">
            LoopIn isn't built around one use case. It's a full private-safety toolkit that travels with you — dates, nights out, rides, campus walks, work shifts, travel, and every situation in between.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className={`group p-8 rounded-3xl border transition-all duration-300 ${
                feature.highlight
                  ? "bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/25 md:col-span-2 lg:col-span-1"
                  : "bg-muted/30 border-transparent hover:border-border hover:bg-white hover:shadow-xl"
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${
                feature.highlight ? "bg-white/20" : "bg-primary/10"
              }`}>
                {feature.highlight
                  ? <PhoneCall className="w-6 h-6 text-white" />
                  : feature.icon}
              </div>
              <div className={`text-xs font-semibold uppercase tracking-widest mb-2 ${feature.highlight ? "text-white/60" : "text-primary/60"}`}>
                {feature.name}
              </div>
              <h3 className={`text-xl font-semibold mb-3 ${feature.highlight ? "text-white" : ""}`}>
                {feature.title}
              </h3>
              <p className={`leading-relaxed ${feature.highlight ? "text-white/80" : "text-muted-foreground"}`}>
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
