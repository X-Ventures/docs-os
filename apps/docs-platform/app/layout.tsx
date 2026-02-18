import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'
import './globals.css'

export const metadata = {
  title: {
    default: 'Docs OS — XLabs Data Room',
    template: '%s — Docs OS',
  },
  description: 'Investor-grade data rooms powered by Docs OS',
}

const navbar = (
  <Navbar
    logo={<span style={{ fontWeight: 800, fontSize: '1.1rem' }}>Docs OS</span>}
    projectLink="https://github.com/X-Ventures/docs-os"
  />
)

const footer = (
  <Footer>
    <span>{new Date().getFullYear()} XLabs — Powered by Docs OS</span>
  </Footer>
)

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <body>
        <Layout
          navbar={navbar}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/X-Ventures/docs-os/tree/main/apps/docs-platform"
          footer={footer}
          sidebar={{ defaultMenuCollapseLevel: 1, autoCollapse: true }}
          editLink="Edit this page"
          toc={{ float: true }}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
