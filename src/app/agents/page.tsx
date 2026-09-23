import AgentDemo from "@/components/AgentDemo";

export const dynamic = "force-dynamic";

/**
 * MPP — machine payments, the fourth front door.
 * Wink is a paywall for the agentic web: AI agents pay @handles in
 * pathUSD over plain HTTP 402, no accounts, no API keys, no humans.
 */
export default function AgentsPage() {
  return (
    <div className="mx-auto max-w-2xl py-10">
      <div className="text-center">
        <div className="text-5xl">🤖</div>
        <h1 className="mt-4 text-2xl font-bold">Agents pay @handles too</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-ink-300">
          Wink speaks <strong className="text-ink-100">MPP — the Machine Payments
          Protocol</strong> (Tempo × Stripe, IETF draft). Any AI agent can buy paid
          resources from a @handle over plain HTTP: 402 challenge → on-chain
          pathUSD payment → receipt. No accounts. No API keys. No humans in the loop.
        </p>
      </div>

      <div className="mt-8">
        <AgentDemo defaultHandle="adaeze" />
      </div>

      {/* the protocol, for builders */}
      <div className="card mono mt-8 space-y-3 p-6 text-[11px] leading-relaxed">
        <div className="font-sans text-xs font-semibold uppercase tracking-widest text-ink-300">
          The wire format
        </div>
        <div className="text-ink-400">
          <span className="text-wink">1 ·</span> GET /api/mpp/analytics/&lt;handle&gt;
        </div>
        <div className="text-ink-500">
          ← 402 Payment Required
          <br />← WWW-Authenticate: Payment scheme="tempo", intent="charge",
          amount="250000", currency="pathUSD", recipient="0x…"
        </div>
        <div className="text-ink-400">
          <span className="text-wink">2 ·</span> agent signs transferWithMemo(0.25
          pathUSD → recipient) on Tempo
        </div>
        <div className="text-ink-400">
          <span className="text-wink">3 ·</span> GET again, Authorization: Payment
          &lt;txHash&gt;
        </div>
        <div className="text-ink-500">
          ← 200 OK + Payment-Receipt: reference="…", asset="pathUSD", settled="tempo"
        </div>
        <div className="font-sans pt-2 text-xs text-ink-500">
          Server verifies every payment on-chain before unlocking (chain is truth) and
          records it on the creator&apos;s ledger as an <code>agent</code> payment —
          creators earn while agents read.
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-ink-500">
        Built on Tempo&apos;s agentic-payments stack · charge intent settles in ~500ms
      </p>
    </div>
  );
}
