export const metadata = {
  title: "Privacy Policy — Wink",
};

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "The short version",
    body: [
      "We collect the minimum needed to run a payments directory: your handle, a display name, an email for sign-in, and your transfer records. We do not sell data, we do not run ad trackers, and we never expose a recipient's wallet address publicly. The one thing we can't hide is the blockchain itself — more on that below.",
    ],
  },
  {
    title: "What we collect",
    body: [
      "Account data: your handle, display name, optional avatar, and the email you sign in with.",
      "Ledger data: transfers you send or receive — amount, memo/message, timestamp, status, and the on-chain transaction hash.",
      "Notifications: we send payment alerts to your email. You can opt out from your dashboard.",
      "Session data: a signed session cookie so you stay signed in. No fingerprinting, no third-party analytics.",
    ],
  },
  {
    title: "What is public by design",
    body: [
      "Tempo is a public ledger. Every confirmed transfer — amount, sender address, recipient address, and any attached memo — is permanently visible on-chain and in block explorers. A wink's message is part of that record; don't put anything in a memo you wouldn't say out loud.",
      "Within Wink, you control the rest: per-handle privacy flags let you hide amounts and your activity feed from other users. Recipient addresses are never shown in the Wink UI — people pay names, not addresses.",
    ],
  },
  {
    title: "What we never do",
    body: [
      "Sell or rent your data. Show ads or embed advertising trackers. Hand your wallet keys to anyone — we never have them. Keep data longer than the ledger and your account require it.",
    ],
  },
  {
    title: "Where it lives",
    body: [
      "Application data is stored in a managed Postgres database (Neon) in the eu-west-2 region. Wallet private keys exist only in your own browser and never touch our servers.",
    ],
  },
  {
    title: "Your choices",
    body: [
      "You can change your privacy flags any time from your dashboard. To delete your account and off-chain records, contact hello@wink.cash from your registered email. On-chain records cannot be erased by us or anyone — that's the nature of a public ledger.",
      "Questions about this policy go to hello@wink.cash. We'll update this page as the product grows and note the date below.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <article>
      <h1 className="font-display text-4xl text-ink-900">
        Privacy <em className="italic text-gold">Policy</em>
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
