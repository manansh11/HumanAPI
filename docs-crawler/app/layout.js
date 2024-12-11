export const metadata = {
  title: 'Documentation Crawler',
  description: 'Process documentation URLs into LLM-friendly format',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
