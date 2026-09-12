import "./globals.css";

export const metadata = {
  title: "CodeCrawl",
  description: "Panic Mode meets Arcade Mode for messy code.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
