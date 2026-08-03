import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3500),
      setTimeout(() => setPhase(4), 5000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-end px-[10vw]"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="max-w-2xl z-10 text-right">
        <motion.h2 
          className="text-[4vw] font-black leading-none font-display mb-4"
          initial={{ opacity: 0, x: 50 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          SMART <span className="text-primary">DATE PLANS</span>
        </motion.h2>

        <motion.p 
          className="text-[1.5vw] text-text-muted mb-12"
          initial={{ opacity: 0 }}
          animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Plan safe meetups. Auto-notify your trusted circle.
        </motion.p>

        <div className="space-y-4 flex flex-col items-end">
          <motion.div 
            className="bg-bg-dark/80 px-6 py-4 rounded-xl border border-white/10 flex items-center gap-4 w-fit"
            initial={{ opacity: 0, x: 50 }}
            animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">1</div>
            <p className="text-lg text-text-secondary">Public Location Confirmed</p>
          </motion.div>

          <motion.div 
            className="bg-bg-dark/80 px-6 py-4 rounded-xl border border-white/10 flex items-center gap-4 w-fit"
            initial={{ opacity: 0, x: 50 }}
            animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">2</div>
            <p className="text-lg text-text-secondary">Check-in Times Set</p>
          </motion.div>
          
          <motion.div 
            className="bg-success/20 px-8 py-5 rounded-xl border border-success/40 w-fit mt-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={phase >= 4 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.6, type: 'spring' }}
          >
            <p className="text-xl text-success font-bold font-display tracking-wide uppercase">Sarah (BFF) Notified</p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
