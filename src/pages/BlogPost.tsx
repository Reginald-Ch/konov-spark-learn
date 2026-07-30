import { useParams, Navigate, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { SEO, createArticleSchema, createBreadcrumbSchema, createFAQSchema } from "@/components/SEO";
import { getBlogPost } from "@/data/blogPosts";
import { ArrowLeft } from "lucide-react";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getBlogPost(slug) : undefined;

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Blog", url: "/blog" },
    { name: post.title, url: `/blog/${post.slug}` },
  ]);

  const articleSchema = createArticleSchema({
    title: post.title,
    description: post.description,
    slug: post.slug,
    publishedDate: post.publishedDate,
    updatedDate: post.updatedDate,
  });

  const faqSchema = post.faqs ? createFAQSchema(post.faqs) : undefined;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={post.title}
        description={post.description}
        canonical={`/blog/${post.slug}`}
        type="article"
        keywords={post.keywords}
        jsonLd={faqSchema ? [breadcrumbSchema, articleSchema, faqSchema] : [breadcrumbSchema, articleSchema]}
      />
      <Navbar />

      <main className="pt-28 pb-16">
        <article className="px-4">
          <div className="container mx-auto max-w-3xl">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 font-space text-sm font-semibold text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Blog
            </Link>

            <span className="mt-6 inline-flex w-fit items-center rounded-full bg-secondary/20 px-3 py-1 font-fredoka text-xs font-bold text-secondary">
              {post.category}
            </span>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-foreground font-fredoka md:text-5xl">
              {post.title}
            </h1>
            <time
              dateTime={post.publishedDate}
              className="mt-4 block font-space text-sm text-muted-foreground"
            >
              Published {formatDate(post.publishedDate)}
              {post.updatedDate && post.updatedDate !== post.publishedDate
                ? ` · Updated ${formatDate(post.updatedDate)}`
                : ""}
            </time>

            <div className="prose prose-lg dark:prose-invert mt-8 max-w-none font-space prose-headings:font-fredoka prose-headings:text-foreground prose-a:text-primary prose-a:font-semibold">
              <ReactMarkdown
                components={{
                  a: ({ node, href, children, ...props }) => (
                    <a
                      href={href}
                      target={href?.startsWith("http") ? "_blank" : undefined}
                      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
                      {...props}
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {post.content}
              </ReactMarkdown>
            </div>

            {post.faqs && post.faqs.length > 0 && (
              <div className="mt-14">
                <h2 className="font-fredoka text-2xl font-bold text-foreground md:text-3xl">
                  Frequently Asked Questions
                </h2>
                <div className="mt-6 space-y-4">
                  {post.faqs.map((faq) => (
                    <div
                      key={faq.question}
                      className="rounded-lg border-2 border-foreground bg-card p-5"
                    >
                      <h3 className="font-fredoka text-lg font-bold text-foreground">{faq.question}</h3>
                      <p className="mt-2 font-space text-muted-foreground">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-14 rounded-lg border-4 border-foreground bg-primary p-8 text-primary-foreground shadow-[6px_6px_0_hsl(var(--foreground))]">
              <h2 className="font-fredoka text-2xl font-bold md:text-3xl">Bring this into your school</h2>
              <p className="mt-3 font-space leading-relaxed">
                KONOV runs hands-on AI workshops and teacher training for schools across Ghana — no computer lab required to get started.
              </p>
              <div className="mt-6 flex flex-col gap-4 sm:flex-row">
                <Button asChild size="lg" variant="secondary" className="font-fredoka border-4 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
                  <Link to="/contact">Talk to Us About a School Partnership</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="font-fredoka border-4 border-foreground bg-background text-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
                  <Link to="/programs">See Our Programs</Link>
                </Button>
              </div>
            </div>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default BlogPost;
