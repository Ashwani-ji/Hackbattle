import './globals.css';

export const metadata = {
  title: 'CodeCrawl',
  description: 'Panic mode and arcade refactor training for buggy code.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
