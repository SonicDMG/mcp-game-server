"use client";
import { Geist, Geist_Mono } from "next/font/google";
import { Fira_Code } from 'next/font/google';
import { Press_Start_2P } from 'next/font/google';
import { useEffect } from "react";
import "./globals.css";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const firaCode = Fira_Code({
  variable: '--font-fira-code',
  subsets: ['latin'],
  display: 'swap',
});

const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-press-start-2p',
  display: 'swap',
});

const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Remove cz-shortcut-listen attribute after hydration
  useEffect(() => {
    document.body.removeAttribute('cz-shortcut-listen');
  }, []);
  return (
    <html lang="en">
      <head>
        <meta property="og:title" content="Create with AI - Play with MCP" />
        <meta property="og:description" content="Build an interactive story using Langflow, then play it in real-time using MCP." />
        <meta property="og:image" content="https://mcplayerone.onrender.com/og-image.png" />
        <meta property="og:url" content="https://mcplayerone.onrender.com/" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Create with AI - Play with MCP" />
        <meta name="twitter:description" content="Build an interactive story using Langflow, then play it in real-time using MCP." />
        <meta name="twitter:image" content="https://mcplayerone.onrender.com/og-image.png" />
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${firaCode.variable} ${pressStart2P.variable} antialiased`}
      >
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </body>
    </html>
  );
}