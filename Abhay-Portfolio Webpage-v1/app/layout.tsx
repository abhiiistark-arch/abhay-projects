import type { Metadata } from "next";
import "./globals.css";
import { SmoothScroll } from "./components/SmoothScroll";
import { CustomCursor } from "./components/CustomCursor";

export const metadata: Metadata = {
  title: "Abhay Pandey",
  description:
    "Passionate AI Engineer, Generative AI Specialist, and Full-Stack Developer based in Mumbai. Building intelligent systems that turn ideas into reality.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  keywords: [
    "AI Engineer",
    "Generative AI",
    "Full-Stack Developer",
    "LangChain",
    "RAG",
    "Voice Agents",
    "Mumbai",
    "Machine Learning",
  ],
  authors: [{ name: "Abhay Pandey" }],
  referrer: "strict-origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    noarchive: false,
    nosnippet: false,
    "max-image-preview": "large",
  },
  openGraph: {
    title: "Abhay Pandey",
    description:
      "Building intelligent systems that turn ideas into reality. Specializing in Generative AI, Agentic Systems, and Full-Stack Development.",
    type: "website",
    locale: "en_US",
  },
  other: {
    "X-Content-Type-Options": "nosniff",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <meta httpEquiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=(), browsing-topics=()" />
      </head>
      <body className="bg-deep-space text-white antialiased">
        <SmoothScroll>
          <CustomCursor />
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}
