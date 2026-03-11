import { Sidebar } from "@/components/layout/sidebar"
import { MobileNav } from "@/components/layout/mobile-nav"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar className="hidden md:flex" />
      <main className="flex-1 overflow-auto p-6 pb-20 md:pb-6">
        {children}
      </main>
      <MobileNav className="md:hidden" />
    </div>
  )
}
