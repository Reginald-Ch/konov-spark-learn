import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO, createBreadcrumbSchema } from "@/components/SEO";
import { Link } from "react-router-dom";
import { Newspaper, ArrowRight } from "lucide-react";
import { blogPosts } from "@/data/blogPosts";

const breadcrumbSchema = createBreadcrumbSchema([
  { name: "Home", url: "/" },
  { name: "Blog", url: "/blog" },
]);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const Blog = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="AI Education Resources For Parents And Schools"
        description="Read practical articles on AI literacy, machine learning for kids, school AI programs, teacher training, and youth AI innovation in Ghana and Africa."
        canonical="/blog"
        keywords={["AI education blog", "AI curriculum Africa", "AI training for teachers in Ghana", "AI literacy for young people", "machine learning for kids"]}
        jsonLd={breadcrumbSchema}
      />
      <Navbar />

      <main className="pt-28 pb-16">
        <section className="px-4 pb-12">
          <div className="container mx-auto max-w-5xl">
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-card px-4 py-2 font-fredoka text-sm font-bold text-primary shadow-[3px_3px_0_hsl(var(--foreground))]">
              <Newspaper className="h-4 w-4" /> KONOV Technologies Blog
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight text-foreground font-fredoka md:text-6xl">
              AI Education Insights
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground font-space md:text-xl">
              Practical, research-backed guidance for schools, teachers and parents navigating AI education across Africa — grounded in real frameworks, not buzzwords.
            </p>
          </div>
        </section>

        <section className="px-4 py-8">
          <div className="container mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
            {blogPosts.map((post) => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="group flex flex-col rounded-lg border-4 border-foreground bg-card p-6 shadow-[5px_5px_0_hsl(var(--foreground))] transition-transform hover:-translate-y-1"
              >
                <span className="inline-flex w-fit items-center rounded-full bg-secondary/20 px-3 py-1 font-fredoka text-xs font-bold text-secondary">
                  {post.category}
                </span>
                <h2 className="mt-4 font-fredoka text-2xl font-bold text-foreground">{post.title}</h2>
                <p className="mt-2 flex-1 font-space text-muted-foreground">{post.description}</p>
                <div className="mt-4 flex items-center justify-between font-space text-sm text-muted-foreground">
                  <time dateTime={post.publishedDate}>{formatDate(post.publishedDate)}</time>
                  <span className="inline-flex items-center gap-1 font-bold text-primary">
                    Read more <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
