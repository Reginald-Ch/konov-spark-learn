// Every outside address the site links to, in one place. An empty string
// means the address hasn't been supplied yet, and links to it are hidden.
export const LINKS = {
  email: "hello@konovtech.com",
  phone: "tel:+233208741517",
  phoneDisplay: "020 874 1517",
  meai: "https://meaitech.com",
  forge: "",
  linkedin: "https://www.linkedin.com/company/konov-artechtist",
};

// The privacy notice is a draft until KONOV's lawyer approves it. While this
// is false the page only renders in development and nothing links to it.
export const PRIVACY_PUBLISHED = false;
export const showPrivacy = PRIVACY_PUBLISHED || import.meta.env.DEV;

export const BOOK_A_CLASS = "/classes#book";
export const WORKSHOP = "/classes#workshop";
export const SPRINT_LIST = "/ai-builder-sprint#join";
