export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section id="summary" className="scroll-mt-16 mb-8">
        <h2 className="text-xl font-semibold mb-4">Summary</h2>
        <p className="text-muted-foreground">Coming in Phase 2</p>
      </section>

      <section id="accounts" className="scroll-mt-16 mb-8">
        <h2 className="text-xl font-semibold mb-4">Accounts</h2>
        <p className="text-muted-foreground">Coming in Phase 2</p>
      </section>

      <section id="transactions" className="scroll-mt-16 mb-8">
        <h2 className="text-xl font-semibold mb-4">Transactions</h2>
        <p className="text-muted-foreground">Coming in Phase 3</p>
      </section>

      <section id="chat" className="scroll-mt-16 mb-8">
        <h2 className="text-xl font-semibold mb-4">Chat</h2>
        <p className="text-muted-foreground">Coming in Phase 4</p>
      </section>
    </div>
  )
}
