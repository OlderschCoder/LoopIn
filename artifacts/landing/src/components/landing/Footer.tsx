import appIcon from "@/assets/app-icon.png";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="border-t border-border bg-white pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <img src={appIcon} alt="LoopIn" className="w-8 h-8 rounded-lg shadow-sm" />
              <span className="font-serif text-xl tracking-tight font-medium">LoopIn</span>
            </div>
            <p className="text-muted-foreground max-w-sm">
              Private safety technology for real life — dates, nights out, rides, campus, travel, and every situation in between.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-primary transition-colors">How it works</a></li>
              <li><a href="#why-it-matters" className="hover:text-primary transition-colors">Why LoopIn</a></li>
              <li><a href="#privacy" className="hover:text-primary transition-colors">Privacy & Security</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
              <li><a href="mailto:support@loopin.app" className="hover:text-primary transition-colors">Support</a></li>
              <li><a href="/terms" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><Link href="/safety" className="hover:text-primary transition-colors">Safety Resources</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} LoopIn. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
