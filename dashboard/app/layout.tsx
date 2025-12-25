import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '4Reindeer Dashboard',
  description: 'Live tracking dashboard for the 4Reindeer tokenomics bot',
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
