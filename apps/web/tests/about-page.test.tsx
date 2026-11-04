import { siteConfig } from "@one-forth/config";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AboutPage, { metadata } from "@/app/about/page";

describe("personal about page", () => {
  it("presents a concise public academic profile", () => {
    const { container } = render(<AboutPage />);

    expect(screen.getByRole("heading", { name: "One Forth" })).toBeVisible();
    expect(screen.getByText("Independent educational project")).toBeVisible();
    expect(screen.getByRole("link", { name: "maintainers@example.org" })).toHaveAttribute(
      "href",
      "mailto:maintainers@example.org",
    );
    expect(screen.getByRole("link", { name: "Explore One Forth" })).toHaveAttribute(
      "href",
      "/zh-CN",
    );
    expect(container.querySelector("main")).toHaveAttribute("lang", "en");
  });

  it("provides canonical and indexable profile metadata", () => {
    const profileUrl = `${siteConfig.url}/about`;

    expect(metadata.alternates?.canonical).toBe(profileUrl);
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    expect(metadata.openGraph).toMatchObject({
      locale: "en_US",
      title: "One Forth",
      url: profileUrl,
    });
  });
});
