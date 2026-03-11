import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import RootLayout from "@/app/layout"

describe("RootLayout", () => {
  it("renders html element with class dark", () => {
    const { container } = render(
      <RootLayout>
        <div>test</div>
      </RootLayout>
    )
    // RootLayout renders <html> which becomes part of the document
    const html = container.querySelector("html")
    expect(html).toBeDefined()
    expect(html?.className).toContain("dark")
  })
})
