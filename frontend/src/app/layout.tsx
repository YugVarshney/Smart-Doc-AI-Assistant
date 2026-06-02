import React from "react";
import Providers from "./providers";
import "./globals.css";

export const metadata = {
  title: "Smart Doc AI Assistant",
  description: "AI-powered document intelligence and interactive knowledge visualization platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Manrope:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`
          body {
            font-family: 'Manrope', 'Inter', system-ui, -apple-system, sans-serif;
          }
          h1, h2, h3, h4, h5, h6 {
            font-family: 'Poppins', 'Space Grotesk', sans-serif;
          }
        `}</style>
      </head>
      <body className="bg-background text-foreground transition-colors duration-200">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
