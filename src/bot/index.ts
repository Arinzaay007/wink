/**
 * Wink Telegram bot runner — long-polling, zero custody.
 * TELEGRAM_BOT_TOKEN=*** npm run bot
 */
import "dotenv/config";
import { createBot, notifyOnce } from "@/lib/telegramBot";
import { TEMPO_NETWORK } from "@/lib/tempo";

const POLL_MS = 5_000;

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error(
      "TELEGRAM_BOT_TOKEN is not set.\n" +
        "1. Talk to @BotFather on Telegram → /newbot\n" +
        "2. Put the token in .env as TELEGRAM_BOT_TOKEN=***\n" +
        "3. npm run bot"
    );
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — the bot needs the Wink database.");
    process.exit(1);
  }

  const bot = createBot(token);
  const loop = setInterval(() => {
    notifyOnce(bot).catch((e) => console.error("notify loop:", e));
  }, POLL_MS);

  const stop = () => {
    clearInterval(loop);
    void bot.stop().finally(() => process.exit(0));
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  await bot.start({
    onStart: (me) =>
      console.log(`😉 Wink bot @${me.username} polling (network: ${TEMPO_NETWORK})`),
  });
}

void main();
