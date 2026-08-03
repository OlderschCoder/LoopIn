import { Link } from "wouter";
import appIcon from "@/assets/app-icon.png";

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <img 
            src={appIcon} 
            alt="LoopIn" 
            className="w-8 h-8 rounded-lg shadow-sm group-hover:scale-105 transition-transform" 
          />
          <span className="font-serif text-xl tracking-tight font-medium">LoopIn</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#private-line" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Private Line</a>
          <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How it works</a>
          <a href="#why-it-matters" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Why LoopIn</a>
          <Link href="/safety" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Safety Tips</Link>
        </nav>

        <div className="flex items-center">
          <a 
            href="#demo" 
            className="bg-foreground text-background hover:bg-primary transition-colors px-4 py-2 rounded-full text-sm font-semibold"
          >
            Try the app
          </a>
        </div>
      </div>
    </header>
  );
}
