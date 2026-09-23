export const metadata = {
  title: "Terms of Service — Wink",
};

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "What Wink is",
    body: [
      "Wink is a name layer for payments. It maps human handles (@yourname) to blockchain addresses and provides sending, receiving, event walls, pay codes, and payout tooling on top of the Tempo network. Wink itself never holds your funds.",
      "You are using a public preview built for the Colosseum Crypto World's Fair. Features may change, reset, or disappear while we iterate.",
    ],
  },
  {
    title: "Testnet stage — no real value",
    body: [
      "During the preview, transfers settle on the Tempo testnet (Moderato). Testnet tokens are supplied by a faucet, have no monetary value, and cannot be exchanged for real money. When and only when we formally promote to mainnet will this change — and we will say so loudly, in writing, first.",
    ],
  },
  {
    title: "Your wallet is yours — completely",
    body: [
      "Wink generates a wallet in your browser and stores the private key only in your device's local storage. We never receive, copy, escrow, or have the ability to move your funds. There is no account recovery: if your browser data is cleared, the funds in that wallet are gone. This is the price of true self-custody, and we consider it a feature.",
      "You are responsible for safeguarding your device and for anything sent from your wallet.",
    ],
  },
  {
    title: "Handles",
    body: [
      "A handle is a registry entry operated by Wink. First claim, first served. We may reclaim handles used for impersonation, fraud, or trademark squatting, and reserve short or premium handles for a future paid tier — our only planned fee. Your handle does not give you ownership of the underlying name as a trademark.",
    ],
  },
  {
    title: "Cross-chain settlement",
    body: [
      "Wink can route value from other chains, always settling into pathUSD on Tempo. Routing uses third-party infrastructure (e.g. Relay) with its own failure modes. We enforce minimums and per-transfer caps, verify arrival on-chain before confirming anything, and show you honest status the whole way. If a route is unavailable we will say so — we never silently hold funds.",
    ],
  },
  {
    title: "The honest fine print",
    body: [
      "The service is provided as-is and as-available, without warranties of any kind. To the maximum extent permitted by law, Wink Labs is not liable for losses arising from blockchain transactions, wallet loss, third-party routes, stablecoin depegging, or network outages.",
      "Nothing here is financial, legal, or investment advice. Stablecoins carry issuer and depeg risk; you use them at your own judgment.",
      "Don't use Wink for anything illegal in your jurisdiction. We may suspend abuse and update these terms with notice on this page.",
    ],
  },
];

export default function TermsPage() {
  return (
    <article>
      <h1 className="font-display text-4xl text-ink-900">
        Terms of <em className="italic text-gold">Service</em>
      </h1>
      <p className="mt-2 text-sm text-ink-400">Effective September 23, 2026</p>

      {SECTIONS.map((s, i) => (
        <section key={s.title} className="mt-10">
          <h2 className="font-display text-xl text-ink-900">
            {String(i + 1).padStart(2, "0")}. {s.title}
          </h2>
          {s.body.map((p) => (
            <p key={p.slice(0, 24)} className="mt-3 text-sm leading-relaxed text-ink-600">
              {p}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
