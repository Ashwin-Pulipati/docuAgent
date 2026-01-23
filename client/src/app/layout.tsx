import type { Metadata } from "next";
import { Nunito, Nunito_Sans, Tangerine } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { SidebarProvider } from "@/components/ui/sidebar";

const tangerine = Tangerine({
  variable: "--font-tangerine",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["200", "300", "400", "600", "700", "800", "900"],
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunitoSans",
  subsets: ["latin"],
  weight: ["200", "300", "400", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DocuAgent",
    template: `%s - DocuAgent`,
  },
  description:
    "DocuAgent: An intelligent application for seamless interaction with your documents using AI-powered chat. Built with Next.js, Django, and LangChain.",
  keywords: [
    "DocuAgent",
    "Ashwin Pulipati",
    "AI workspace",
    "document management",
    "RAG",
    "PDF chat",
    "AI chat",
    "Next.js",
    "Django",
    "LangChain",
  ],
  authors: [
    { name: "Ashwin Pulipati", url: "https://github.com/Ashwin-Pulipati" },
  ],
  creator: "Ashwin Pulipati",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://github.com/Ashwin-Pulipati/docuAgent",
    title: "DocuAgent - Agentic RAG",
    description:
      "An intelligent application for seamless interaction with your documents using AI-powered chat.",
    siteName: "DocuAgent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${tangerine.variable} ${nunito.variable} ${nunitoSans.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-2xl focus:bg-background focus:px-4 focus:py-2 focus:ring-2 focus:ring-ring"
        >
          Skip to content
        </a>

        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider>{children}</SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
