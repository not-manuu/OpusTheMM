import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Frostbyte Dashboard',
  description: 'Live tracking dashboard for the Frostbyte tokenomics bot',
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
