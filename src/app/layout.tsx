import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Interview Manager | Track Your Job Search",
  description: "Manage your job search like a pro. Track companies, schedule interviews, and never miss a follow-up.",
  openGraph: {
    title: "Interview Manager | Track Your Job Search",
    description: "Manage your job search like a pro. Track companies, schedule interviews, and never miss a follow-up.",
    type: "website",
  },
};

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isClerkConfigured = clerkKey && clerkKey.startsWith("pk_");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );

  if (!isClerkConfigured) {
    return content;
  }

  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#6366f1",
          colorBackground: "#1e293b",
          colorText: "#f8fafc",
          colorInputBackground: "#0f172a",
          colorInputText: "#f8fafc",
          borderRadius: "0.5rem",
        },
        elements: {
          formButtonPrimary: "bg-indigo-500 hover:bg-indigo-400 text-white font-semibold",
          card: "bg-slate-800 border border-slate-700",
          headerTitle: "text-slate-100",
          headerSubtitle: "text-slate-400",
          socialButtonsBlockButton: "bg-slate-900 border border-slate-700 hover:bg-slate-800",
          formFieldInput: "bg-slate-900 border-slate-700 text-slate-100",
          footerActionLink: "text-indigo-400 hover:text-indigo-300",
        },
      }}
    >
      {content}
    </ClerkProvider>
  );
}
