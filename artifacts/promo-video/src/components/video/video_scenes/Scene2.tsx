import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3500),
      setTimeout(() => setPhase(4), 5000),
      setTimeout(() => setPhase(5), 6500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-start px-[10vw]"
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '-100%', opacity: 0 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="max-w-2xl z-10">
        <motion.h2 
          className="text-[4vw] font-black leading-none font-display mb-8"
          initial={{ opacity: 0, x: -50 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          AI <span className="text-secondary">ANALYSIS</span>
        </motion.h2>

        <div className="space-y-6">
          <motion.div 
            className="bg-bg-dark/60 p-6 rounded-2xl border border-white/10"
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            <div className="flex items-center gap-4 mb-2">
              <div className="w-3 h-3 rounded-full bg-error" />
              <span className="text-lg font-bold text-error font-display uppercase">Red Flag Detected</span>
            </div>
            <p className="text-text-secondary">"You don't need to tell your friends where we're going."</p>
          </motion.div>

          <motion.div 
            className="bg-bg-dark/60 p-6 rounded-2xl border border-white/10"
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            <div className="flex items-center gap-4 mb-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-lg font-bold text-success font-display uppercase">Green Flag</span>
            </div>
            <p className="text-text-secondary">"Let's meet at the coffee shop downtown at 2 PM."</p>
          </motion.div>
          
          <motion.div 
            className="bg-primary/20 p-6 rounded-2xl border border-primary/40 mt-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={phase >= 4 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.6, type: 'spring' }}
          >
            <p className="text-xl text-primary font-medium">Your AI Wingwoman spots what you might miss.</p>
          </motion.div>
        </div>
      </div>
      
      {/* Decorative */}
      {phase >= 1 && (
        <motion.div 
          className="absolute right-[15vw] top-1/2 -translate-y-1/2 w-[30vw] h-[30vw] border-[4px] border-secondary/20 rounded-full"
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div 
            className="absolute inset-0 border-[2px] border-secondary/40 rounded-full border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      )}
    </motion.div>
  );
}
