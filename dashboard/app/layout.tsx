import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Opus the Market Maker Dashboard',
  description: 'Live tracking dashboard for Opus the Market Maker tokenomics bot',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  )
}
