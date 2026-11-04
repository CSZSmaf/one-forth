import { siteConfig } from "@one-forth/config";
import { BookCover } from "@one-forth/ui";
import Link from "next/link";
import type { BookShelfEntry } from "@/lib/bookshelf";

export function BookShelf({
  books,
  titleAs = "h3",
}: Readonly<{ books: readonly BookShelfEntry[]; titleAs?: "h2" | "h3" }>) {
  return (
    <ol className="book-shelf">
      {books.map((book) => (
        <li key={book.id}>
          <Link
            className="book-shelf__link"
            href={book.href}
            aria-label={`${book.code} ${book.title}`}
          >
            <BookCover
              code={book.code}
              title={book.title}
              series={book.seriesTitle}
              publisher={siteConfig.brand.wordmark}
              color={book.color}
              variant={book.variant}
              titleAs={titleAs}
            />
          </Link>
          <p className="book-shelf__structure">{book.structure}</p>
        </li>
      ))}
    </ol>
  );
}
