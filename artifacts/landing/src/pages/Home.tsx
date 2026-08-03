import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { useSocialProof } from "@/hooks/useSocialProof";
import { Features } from "@/components/landing/Features";
import { PrivateLine } from "@/components/landing/PrivateLine";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Privacy } from "@/components/landing/Privacy";
import { WhyItMatters } from "@/components/landing/WhyItMatters";
import { Footer } from "@/components/landing/Footer";
import { StoreBadges } from "@/components/landing/StoreBadges";

export default function Home() {
  const socialProof = useSocialProof();
  return (
    <main className="min-h-screen bg-background selection:bg-primary/30 selection:text-foreground">
      <Navbar />
      <Hero />
      <Features />
      <PrivateLine />
      <HowItWorks />
      <Privacy />
      <WhyItMatters />
      
      {/* Final CTA Section */}
      <section className="py-24 bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl mb-6 font-serif max-w-3xl mx-auto">
            Ready to move through the world with confidence?
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Get the private safety layer that stays with you — after the introduction, after the app, after the swipe.
          </p>
          
          <StoreBadges className="items-center" rating={socialProof.rating} reviewCount={socialProof.reviewCount} />
        </div>
      </section>
      
      <Footer />
    </main>
  );
}
