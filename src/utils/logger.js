import { DateTime } from "luxon";
import { env } from "../config/config.js";

export function logHeader(interaction) {
  const now = DateTime.now().setZone(env.timezone).toFormat(env.date_format);
  console.log("=".repeat(97));
  console.log(
    `========== Date: ${now} Call ID: ${interaction.id} User: ${interaction.user.username} ==========`
  );
}

export function logFooter({ activeCount, wipCount, haltedCount }) {
  console.log(
    `====================== Pull request Summary: Active: ${activeCount} WIP: ${wipCount} Halted PRs: ${haltedCount} =====================`
  );
  console.log("=".repeat(97));
  console.log("");
}
