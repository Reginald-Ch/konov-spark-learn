import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  type?: "website" | "article" | "course";
  keywords?: string[];
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
}

const SITE_URL = "https://konovartechtist.com";
const SITE_NAME = "KONOV";

// Organization structured data - used across all pages
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  alternateName: ["KONOV AI Hub", "Konov Artechtist", "KONOV Ghana"],
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    "@id": `${SITE_URL}/#logo`,
    url: `${SITE_URL}/favicon.png`,
    contentUrl: `${SITE_URL}/favicon.png`,
    width: 512,
    height: 512,
    caption: SITE_NAME
  },
  image: `${SITE_URL}/og-image.jpg`,
  description: "Africa's first AI & ML literacy hub for kids ages 6-16. Hands-on AI, robotics, coding, app development, STEM workshops, weekend programs and hackathons in Ghana.",
  foundingLocation: "Accra, Ghana",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Accra",
    addressRegion: "Greater Accra",
    addressCountry: "Ghana"
  },
  areaServed: [
    { "@type": "Country", name: "Ghana" },
    { "@type": "City", name: "Accra" },
    { "@type": "Continent", name: "Africa" }
  ],
  knowsAbout: [
    "Artificial Intelligence Education",
    "Machine Learning for Kids",
    "Robotics for Children",
    "Coding for Kids",
    "STEM Education Ghana",
    "App Development for Teens",
    "Hackathons for Youth",
    "Weekend Tech Programs",
    "AI Literacy Africa"
  ],
  sameAs: [
    "https://twitter.com/konovartechtist",
    "https://instagram.com/konovartechtist",
    "https://linkedin.com/company/konovartechtist",
    "https://konovartechtist.com"
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    email: "konovartechtist@gmail.com",
    areaServed: "GH",
    availableLanguage: "English"
  }
};

// LocalBusiness schema — helps Google surface a knowledge panel / map card
const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${SITE_URL}/#localbusiness`,
  name: SITE_NAME,
  image: `${SITE_URL}/favicon.png`,
  url: SITE_URL,
  telephone: "+233",
  email: "konovartechtist@gmail.com",
  priceRange: "$$",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Accra",
    addressRegion: "Greater Accra",
    addressCountry: "GH"
  },
  geo: { "@type": "GeoCoordinates", latitude: 5.6037, longitude: -0.1870 },
  openingHoursSpecification: [{
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
    opens: "09:00", closes: "18:00"
  }]
};


// Website structured data with sitelinks search box
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  description: "Africa's first AI & ML literacy hub for kids ages 6-16",
  publisher: {
    "@id": `${SITE_URL}/#organization`
  },
  inLanguage: "en"
};

// Site Navigation Element - helps Google show sitelinks
const siteNavigationSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "@id": `${SITE_URL}/#navigation`,
  name: "Main Navigation",
  itemListElement: [
    {
      "@type": "SiteNavigationElement",
      position: 1,
      name: "Programs",
      description: "AI & ML workshops, tech camps, and tech fairs for kids ages 6-16",
      url: `${SITE_URL}/programs`
    },
    {
      "@type": "SiteNavigationElement",
      position: 2,
      name: "About Us",
      description: "Learn about KONOV's mission to empower young tech innovators in Africa",
      url: `${SITE_URL}/about`
    },
    {
      "@type": "SiteNavigationElement",
      position: 3,
      name: "Community",
      description: "Join our community of young innovators and tech-savvy kids in Ghana",
      url: `${SITE_URL}/community`
    },
    {
      "@type": "SiteNavigationElement",
      position: 4,
      name: "Resources",
      description: "Free AI & ML learning resources for kids and parents",
      url: `${SITE_URL}/resources`
    },
    {
      "@type": "SiteNavigationElement",
      position: 5,
      name: "Contact",
      description: "Get in touch with KONOV for programs and partnerships",
      url: `${SITE_URL}/contact`
    }
  ]
};

export const SEO = ({ 
  title, 
  description, 
  canonical,
  ogImage = "/og-image.jpg",
  type = "website",
  keywords = [],
  jsonLd,
  noindex = false
}: SEOProps) => {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const defaultKeywords = [
    "AI for kids Ghana",
    "machine learning for children Africa",
    "robotics for kids Ghana",
    "coding classes Accra",
    "kids coding Ghana",
    "STEM education Ghana",
    "STEM Accra",
    "app development for kids",
    "hackathons for kids Ghana",
    "youth hackathon Accra",
    "weekend tech programs Ghana",
    "AI workshops for kids",
    "tech camp Ghana",
    "summer coding camp Accra",
    "AI literacy Africa",
    "artificial intelligence education",
    "MeAI app",
    "KONOV",
    "Konov Artechtist",
    "Konov Ghana"
  ];
  const allKeywords = [...new Set([...defaultKeywords, ...keywords])];
  
  // Combine all JSON-LD schemas
  const schemas: Record<string, unknown>[] = [organizationSchema, localBusinessSchema, websiteSchema, siteNavigationSchema];

  if (jsonLd) {
    if (Array.isArray(jsonLd)) {
      schemas.push(...jsonLd);
    } else {
      schemas.push(jsonLd);
    }
  }
  
  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={allKeywords.join(", ")} />
      <meta name="author" content={SITE_NAME} />
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />
      
      {/* Geo Tags for Local SEO */}
      <meta name="geo.region" content="GH" />
      <meta name="geo.placename" content="Accra" />
      <meta name="geo.position" content="5.6037;-0.1870" />
      <meta name="ICBM" content="5.6037, -0.1870" />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${SITE_URL}${ogImage}`} />
      <meta property="og:image:width" content="1080" />
      <meta property="og:image:height" content="1080" />
      <meta property="og:image:alt" content={`${SITE_NAME} - AI Education for Kids`} />
      <meta property="og:locale" content="en_US" />
      {canonical && <meta property="og:url" content={`${SITE_URL}${canonical}`} />}
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@konovartechtist" />
      <meta name="twitter:creator" content="@konovartechtist" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${SITE_URL}${ogImage}`} />
      <meta name="twitter:image:alt" content={`${SITE_NAME} - AI Education for Kids`} />
      
      {/* Canonical */}
      {canonical && <link rel="canonical" href={`${SITE_URL}${canonical}`} />}
      
      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(schemas)}
      </script>
    </Helmet>
  );
};

// Helper function to create Course schema
export const createCourseSchema = (course: {
  name: string;
  description: string;
  provider?: string;
  ageRange?: string;
  duration?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Course",
  name: course.name,
  description: course.description,
  provider: {
    "@type": "EducationalOrganization",
    name: course.provider || SITE_NAME,
    url: SITE_URL
  },
  educationalLevel: course.ageRange || "Ages 6-14",
  timeRequired: course.duration,
  inLanguage: "en",
  isAccessibleForFree: false,
  hasCourseInstance: {
    "@type": "CourseInstance",
    courseMode: "onsite",
    location: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Accra",
        addressCountry: "Ghana"
      }
    }
  }
});

// Helper function to create FAQ schema
export const createFAQSchema = (faqs: { question: string; answer: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(faq => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer
    }
  }))
});

// Helper function to create Breadcrumb schema
export const createBreadcrumbSchema = (items: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: `${SITE_URL}${item.url}`
  }))
});

// Helper function to create Event schema (for workshops/camps)
export const createEventSchema = (event: {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  location?: string;
  price?: number;
}) => ({
  "@context": "https://schema.org",
  "@type": "EducationEvent",
  name: event.name,
  description: event.description,
  startDate: event.startDate,
  endDate: event.endDate,
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  location: {
    "@type": "Place",
    name: event.location || "Accra, Ghana",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Accra",
      addressCountry: "Ghana"
    }
  },
  organizer: {
    "@type": "EducationalOrganization",
    name: SITE_NAME,
    url: SITE_URL
  },
  offers: event.price ? {
    "@type": "Offer",
    price: event.price,
    priceCurrency: "GHS",
    availability: "https://schema.org/InStock"
  } : undefined
});
