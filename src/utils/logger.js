import { DateTime } from "luxon";
import { env } from "../config/config.js";

export function logHeader(interaction) {
  const now = DateTime.now().setZone(env.timezone).toFormat(env.date_format);

  console.log(
    "══════════════════════════════════════════════════════════════════════════════════════"
  );
  console.log(
    `📅 Date: ${now}    🔖 Call ID: ${interaction.id}    👤 User: ${interaction.user.username}`
  );
  console.log(
    "══════════════════════════════════════════════════════════════════════════════════════"
  );
}

export function logFooter({ activeCount, wipCount, haltedCount }) {
  console.log(
    "══════════════════════════════════════════════════════════════════════════════════════"
  );
  console.log("🔎 Pull Request Summary:");
  console.log(`  Active: ${activeCount}`);
  console.log(`  WIP: ${wipCount}`);
  console.log(`  Halted PRs: ${haltedCount}`);
  console.log(
    "══════════════════════════════════════════════════════════════════════════════════════"
  );
  console.log("");
}
