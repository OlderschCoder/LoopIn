import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4() {
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
      className="absolute inset-0 flex flex-col items-center justify-center px-[10vw]"
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.h2 
        className="text-[3.5vw] font-black leading-none font-display mb-12 text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        PRIVATE <span className="text-accent">EVIDENCE LOCKER</span>
      </motion.h2>

      <div className="grid grid-cols-2 gap-8 w-full max-w-5xl">
        <motion.div 
          className="bg-bg-dark/60 p-8 rounded-3xl border border-white/5 backdrop-blur-sm"
          initial={{ opacity: 0, x: -50 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.8, type: 'spring' }}
        >
          <div className="text-accent mb-4 opacity-80">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <h3 className="text-2xl font-bold mb-2">100% Device Local</h3>
          <p className="text-text-muted">Your notes, screenshots, and logs never leave your phone. Privacy by design.</p>
        </motion.div>

        <motion.div 
          className="bg-bg-dark/60 p-8 rounded-3xl border border-white/5 backdrop-blur-sm"
          initial={{ opacity: 0, x: 50 }}
          animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
          transition={{ duration: 0.8, type: 'spring' }}
        >
          <div className="text-primary mb-4 opacity-80">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20v-6M6 20V10M18 20V4"></path></svg>
          </div>
          <h3 className="text-2xl font-bold mb-2">Pattern Tracking</h3>
          <p className="text-text-muted">Post-date reflections help you track emotional patterns and spot subtle red flags over time.</p>
        </motion.div>
      </div>

    </motion.div>
  );
}
