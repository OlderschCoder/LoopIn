import { motion } from "framer-motion";
import { PhoneMockup } from "./PhoneMockup";
import { StoreBadges } from "./StoreBadges";
import { useSocialProof } from "@/hooks/useSocialProof";

export function Hero() {
  const socialProof = useSocialProof();
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-primary/10 to-transparent -z-10 blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute top-40 right-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-3xl -z-10 opacity-40 pointer-events-none" />
      
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Private safety technology
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl leading-[1.1] mb-6">
                Safety that stays with you. <span className="text-gradient font-style-italic">After the introduction.</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                LoopIn is private safety technology for real life — dates, nights out, rides, meetups, campus walks, travel, and every situation in between. Not a dating app add-on. A safety layer that protects the person, wherever they go.
              </p>
              
              <div className="flex flex-wrap items-center gap-4">
                <a 
                  href="#demo"
                  className="bg-primary text-primary-foreground px-8 py-4 rounded-full font-semibold text-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-95"
                >
                  Try the interactive demo
                </a>
                <a 
                  href="#how-it-works"
                  className="bg-white text-foreground border border-border px-8 py-4 rounded-full font-semibold text-lg hover:bg-muted transition-colors active:scale-95"
                >
                  Watch the video
                </a>
              </div>
              
              <StoreBadges className="mt-8" rating={socialProof.rating} reviewCount={socialProof.reviewCount} />

              <div className="mt-8 flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full bg-muted border-2 border-background overflow-hidden">
                      <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i}&backgroundColor=e11d6b,7c3aed`} alt="User" />
                    </div>
                  ))}
                </div>
                <p>Thousands of people safer every day.</p>
              </div>
            </motion.div>
          </div>

          <div className="flex justify-center lg:justify-end" id="demo">
            <PhoneMockup />
          </div>

        </div>
      </div>
    </section>
  );
}
