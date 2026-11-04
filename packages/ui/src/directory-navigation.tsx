export interface DirectoryNavigationItem {
  readonly href: string;
  readonly label: string;
  readonly count?: number;
  readonly selected: boolean;
}

export function DirectoryNavigation({
  label,
  items,
  secondary = false,
}: {
  readonly label: string;
  readonly items: readonly DirectoryNavigationItem[];
  readonly secondary?: boolean;
}) {
  return (
    <nav
      className={`directory-navigation${secondary ? " directory-navigation--secondary" : ""}`}
      aria-label={label}
    >
      {items.map((item) => (
        <a key={item.href} href={item.href} aria-current={item.selected ? "page" : undefined}>
          {item.label}
          {item.count !== undefined ? <span>{item.count}</span> : null}
        </a>
      ))}
    </nav>
  );
}
