import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SelectQuote Generative Dashboards",
  description: "Prompt-driven Alpha Vantage dashboard builder demo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-slate-950 text-slate-100">
      <body className="h-full font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
