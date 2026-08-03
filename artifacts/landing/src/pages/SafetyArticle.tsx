import { Link, useParams } from "wouter";
import { getArticleBySlug } from "@/data/safetyArticles";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import NotFound from "@/pages/not-found";

const categoryColors: Record<string, string> = {
  Dating: "bg-rose-50 text-rose-700",
  "Nights Out": "bg-purple-50 text-purple-700",
  Campus: "bg-blue-50 text-blue-700",
  Transportation: "bg-amber-50 text-amber-700",
  Travel: "bg-emerald-50 text-emerald-700",
};

export default function SafetyArticle() {
  const params = useParams<{ slug: string }>();
  const article = getArticleBySlug(params.slug);

  if (!article) return <NotFound />;

  const description = article.description;
  const title = `${article.title} | LoopIn Safety Resources`;

  return (
    <div className="min-h-screen bg-background">
      {/* SEO meta tags via <head> manipulation */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={article.title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="article" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={article.title} />
      <meta name="twitter:description" content={description} />

      <Navbar />

      <main className="pt-28 pb-24">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>·</span>
            <Link href="/safety" className="hover:text-primary transition-colors">Safety Resources</Link>
            <span>·</span>
            <span className="text-foreground truncate">{article.title}</span>
          </div>

          {/* Article header */}
          <header className="mb-10">
            <div className="flex flex-wrap items-center gap-3 mb-5">
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

            <h1 className="text-3xl md:text-4xl font-serif font-medium leading-tight mb-4">
              {article.title}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {article.description}
            </p>
          </header>

          {/* Article body */}
          <div className="prose-article">
            {article.content}
          </div>

          {/* Footer CTA */}
          <div className="mt-16 pt-10 border-t border-border">
            <div className="bg-muted/40 rounded-2xl p-6 md:p-8">
              <h3 className="font-serif text-xl font-medium mb-2">Stay safe with LoopIn</h3>
              <p className="text-muted-foreground text-sm mb-4">
                A private number, real-time check-ins, and trusted contacts — all in one app.
              </p>
              <a
                href="/#demo"
                className="inline-block bg-foreground text-background hover:bg-primary transition-colors px-5 py-2.5 rounded-full text-sm font-semibold"
              >
                Try the app
              </a>
            </div>

            <div className="mt-8">
              <Link href="/safety" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                ← Back to Safety Resources
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
