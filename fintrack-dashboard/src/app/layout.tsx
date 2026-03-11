import type { Metadata } from "next"
import localFont from "next/font/local"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const satoshi = localFont({
  src: [
    {
      path: "../../public/fonts/Satoshi-Variable.woff2",
      style: "normal",
    },
  ],
  variable: "--font-satoshi",
  display: "swap",
})

export const metadata: Metadata = {
  title: "FinTrack",
  description: "Personal finance dashboard",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={satoshi.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
