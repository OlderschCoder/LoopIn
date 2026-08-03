import { motion } from "framer-motion";
import { PromoVideo } from "./PromoVideo";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-muted/30 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          <div className="order-2 lg:order-1">
            <PromoVideo />
          </div>

          <div className="order-1 lg:order-2 max-w-xl">
            <h2 className="text-4xl md:text-5xl mb-6">See how it <span className="text-gradient">feels</span>.</h2>
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
              LoopIn isn't about surveillance. It's about having a quiet, smart safety layer in your pocket that activates when you need it and stays out of the way when you don't.
            </p>

            <div className="space-y-8">
              {[
                { step: "01", title: "Analyze before you go", desc: "Share a profile, chat, or situation. The AI highlights potential red flags and gives you a plain-language read before you commit." },
                { step: "02", title: "Set your safety net", desc: "Pick your Trusted Crew, set check-in times, start Walk With Me. LoopIn knows your plan and watches quietly in the background." },
                { step: "03", title: "Go live your life", desc: "Miss a check-in and your circle is alerted automatically. Need out fast? One tap triggers your Emergency Loop or Fake Call." }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2, duration: 0.5 }}
                  className="flex gap-4"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-serif text-lg">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-2">{item.title}</h4>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
