import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"

// Mock next-themes
const mockSetTheme = vi.fn()
let mockResolvedTheme = "dark"

vi.mock("next-themes", () => ({
  useTheme: () => ({
    setTheme: mockSetTheme,
    resolvedTheme: mockResolvedTheme,
  }),
}))

import { ThemeToggle } from "@/components/layout/theme-toggle"

describe("theme toggle", () => {
  it("renders toggle button", () => {
    render(<ThemeToggle />)
    const button = screen.getByRole("button", { name: /toggle theme/i })
    expect(button).toBeInTheDocument()
  })

  it("calls setTheme with light when in dark mode", () => {
    mockResolvedTheme = "dark"
    render(<ThemeToggle />)
    const button = screen.getByRole("button", { name: /toggle theme/i })
    fireEvent.click(button)
    expect(mockSetTheme).toHaveBeenCalledWith("light")
  })

  it("calls setTheme with dark when in light mode", () => {
    mockResolvedTheme = "light"
    render(<ThemeToggle />)
    const button = screen.getByRole("button", { name: /toggle theme/i })
    fireEvent.click(button)
    expect(mockSetTheme).toHaveBeenCalledWith("dark")
  })

  it("has sr-only label for accessibility", () => {
    render(<ThemeToggle />)
    expect(screen.getByText("Toggle theme")).toBeInTheDocument()
  })
})
