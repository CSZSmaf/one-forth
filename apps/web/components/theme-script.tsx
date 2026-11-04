import Script from "next/script";

const themeBootScript = `(() => {
  try {
    const saved = localStorage.getItem("one-forth-theme");
    const theme = saved === "light" || saved === "dark"
      ? saved
      : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
  } catch { document.documentElement.dataset.theme = "light"; }
})();`;

export function ThemeScript() {
  return (
    <Script
      id="one-forth-theme"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: themeBootScript }}
    />
  );
}
