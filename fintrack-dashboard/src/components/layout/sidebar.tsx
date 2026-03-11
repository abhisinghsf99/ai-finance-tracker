"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ArrowLeftRight,
  Repeat,
  MessageSquare,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
// ThemeToggle removed - dark-only app

interface NavItem {
  href: string
  icon: LucideIcon
  label: string
}

const navItems: NavItem[] = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/transactions", icon: ArrowLeftRight, label: "Transactions" },
  { href: "/recurring", icon: Repeat, label: "Recurring" },
  { href: "/chat", icon: MessageSquare, label: "Chat" },
]

function NavLink({ href, icon: Icon, label }: NavItem) {
  const pathname = usePathname()
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 cursor-pointer",
        "text-muted-foreground hover:text-foreground hover:bg-accent/10",
        isActive && "text-foreground bg-accent/10"
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-primary" />
      )}
      <Icon className="h-5 w-5 shrink-0" />
      <span>{label}</span>
    </Link>
  )
}

export function Sidebar({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "flex h-screen w-60 flex-col border-r border-border bg-card p-4",
        className
      )}
    >
      {/* Branding */}
      <div className="mb-6 px-3 py-2">
        <h1 className="text-xl font-bold tracking-tight text-primary">
          FinTrack
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      {/* Spacer */}
      <div className="mt-auto">
        <Separator className="mb-4" />
      </div>
    </aside>
  )
}
