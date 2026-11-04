import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ResourceCard } from "@/components/mdx-components";

describe("MDX resource cards", () => {
  it("gives repeated official-source links distinct accessible names", () => {
    const view = render(
      <>
        <ResourceCard id="wasserman-all-of-statistics" />
        <ResourceCard id="casella-berger-statistical-inference-2e" />
        <ResourceCard id="book-of-proof-hammack" />
      </>,
    );
    expect(screen.getByText("Richard Hammack")).toBeVisible();
    expect(view.container.textContent).not.toMatch(/暂无可核实信息|核验|推测性补写|不适用/);
    expect(view.container.querySelector("small")).toBeNull();

    expect(
      screen.getByRole("link", {
        name: "打开 All of Statistics: A Concise Course in Statistical Inference 的官方来源",
      }),
    ).toHaveAttribute("href", "https://link.springer.com/book/10.1007/978-0-387-21736-9");
    expect(
      screen.getByRole("link", {
        name: "打开 Statistical Inference, Second Edition 的官方来源",
      }),
    ).toHaveAttribute(
      "href",
      "https://www.cengage.com/c/statistical-inference-2e-casella-berger/9780534243128/",
    );
  });

  it("links M07 references to the verified open-textbook sources", () => {
    render(
      <>
        <ResourceCard id="discrete-mathematics-open-introduction-4e" />
        <ResourceCard id="applied-discrete-structures-runestone" />
      </>,
    );

    expect(
      screen.getByRole("link", {
        name: "打开 Discrete Mathematics: An Open Introduction, Fourth Edition 的官方来源",
      }),
    ).toHaveAttribute("href", "https://discrete.openmathbooks.org/dmoi4.html");
    expect(
      screen.getByRole("link", {
        name: "打开 Applied Discrete Structures 的官方来源",
      }),
    ).toHaveAttribute("href", "https://runestone.academy/ns/books/published/ads/adsindex.html");
  });
});
