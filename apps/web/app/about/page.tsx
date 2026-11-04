import { siteConfig } from "@one-forth/config";
import type { Metadata } from "next";
import Link from "next/link";

const profileUrl = new URL("/about", `${siteConfig.url}/`).toString();
const profileDescription = `${siteConfig.profile.name} at ${siteConfig.profile.affiliation}.`;

export const metadata: Metadata = {
  title: siteConfig.profile.name,
  description: profileDescription,
  alternates: { canonical: profileUrl },
  robots: { index: true, follow: true },
  authors: [{ name: siteConfig.profile.name, url: profileUrl }],
  creator: siteConfig.profile.name,
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: siteConfig.name,
    title: siteConfig.profile.name,
    description: profileDescription,
    url: profileUrl,
  },
  twitter: {
    card: "summary",
    title: siteConfig.profile.name,
    description: profileDescription,
  },
};

export default function AboutPage() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <main id="main-content" className="personal-page" lang="en">
        <article className="personal-profile" aria-labelledby="personal-profile-name">
          <header>
            <p className="eyebrow">Personal page</p>
            <h1 id="personal-profile-name">{siteConfig.profile.name}</h1>
            <p className="personal-profile__affiliation">{siteConfig.profile.affiliation}</p>
          </header>

          <address className="personal-profile__contact">
            <span>Contact</span>
            <a href={`mailto:${siteConfig.profile.email}`}>{siteConfig.profile.email}</a>
          </address>

          <p className="personal-profile__site-link">
            <Link href="/zh-CN">Explore One Forth</Link>
          </p>
        </article>
      </main>
    </>
  );
}
