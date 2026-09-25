import Link from "next/link";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="py-14">
      <Link
        href="/"
        className="font-display text-sm italic text-ink-400 transition-colors hover:text-gold"
      >
        ← back to wink
      </Link>
      <div className="mt-6 max-w-2xl">
        {children}
        <p className="mt-12 border-t border-line pt-6 text-xs text-ink-400">
          Wink Labs · wink.cash · built on Tempo. These documents govern the
          public preview; questions go to hello@wink.cash.
        </p>
      </div>
    </div>
  );
}
