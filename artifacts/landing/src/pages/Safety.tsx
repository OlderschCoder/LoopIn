import { Link } from "wouter";
import { safetyArticles } from "@/data/safetyArticles";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

const categoryColors: Record<string, string> = {
  Dating: "bg-rose-50 text-rose-700",
  "Nights Out": "bg-purple-50 text-purple-700",
  Campus: "bg-blue-50 text-blue-700",
  Transportation: "bg-amber-50 text-amber-700",
  Travel: "bg-emerald-50 text-emerald-700",
};

export default function Safety() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-28 pb-24">
        {/* Hero */}
        <div className="container mx-auto px-4 max-w-4xl mb-16">
          <p className="text-sm font-medium text-primary mb-3 tracking-wide uppercase">Safety Resources</p>
          <h1 className="text-4xl md:text-5xl font-serif font-medium mb-5 leading-tight">
            Stay safe out there.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Practical guides for dates, nights out, campus life, rideshares, and travel. No fluff — just the habits that actually matter.
          </p>
        </div>

        {/* Articles grid */}
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid gap-6 md:gap-8">
            {safetyArticles.map((article) => (
              <Link key={article.slug} href={`/safety/${article.slug}`}>
                <article className="group border border-border rounded-2xl p-6 md:p-8 bg-white hover:border-primary/40 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        categoryColors[article.category] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {article.category}
                    </span>
                    <span className="text-xs text-muted-foreground">{article.readTime}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{article.publishedDate}</span>
                  </div>

                  <h2 className="text-xl md:text-2xl font-serif font-medium mb-3 group-hover:text-primary transition-colors leading-snug">
                    {article.title}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">{article.description}</p>

                  <span className="text-sm font-semibold text-primary group-hover:underline">
                    Read article →
                  </span>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
