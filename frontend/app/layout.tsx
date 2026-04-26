import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Economy Simulator',
  description: 'Autonomous AI agents simulating a real-time economy',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0a0f]">{children}</body>
    </html>
  )
}
