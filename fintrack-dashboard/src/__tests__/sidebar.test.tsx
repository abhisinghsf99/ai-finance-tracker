import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"

// Mock next/navigation
const mockPathname = vi.fn(() => "/")
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}))

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: () => ({
    setTheme: vi.fn(),
    resolvedTheme: "dark",
  }),
}))

import { Sidebar } from "@/components/layout/sidebar"

describe("sidebar navigation", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/")
  })

  it("renders 4 navigation items with correct labels", () => {
    render(<Sidebar />)
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
    expect(screen.getByText("Transactions")).toBeInTheDocument()
    expect(screen.getByText("Recurring")).toBeInTheDocument()
    expect(screen.getByText("Chat")).toBeInTheDocument()
  })

  it("renders FinTrack branding", () => {
    render(<Sidebar />)
    expect(screen.getByText("FinTrack")).toBeInTheDocument()
  })

  it("highlights active page with accent bar", () => {
    mockPathname.mockReturnValue("/transactions")
    render(<Sidebar />)
    const transactionsLink = screen.getByRole("link", { name: /transactions/i })
    // Active link should have foreground text styling
    expect(transactionsLink.className).toMatch(/text-foreground/)
  })
})
