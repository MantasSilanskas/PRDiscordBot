import { DateTime } from "luxon";
import { env } from "../config/config.js";
import { logHeader, logFooter } from "../utils/logger.js";
import {
  getOrCreateThread,
  getExistingPRLinks,
  postNewPRs,
} from "../services/discord.js";
import { fetchPullRequests, categorizePRs } from "../services/bitbucket.js";

export async function handlePRCommand(message) {
  logHeader(message);

  await message.delete();
  const threadName =
    DateTime.now().setZone(env.timezone).toISODate() + " Pull requests!";
  const thread = await getOrCreateThread(message, threadName);
  const existingPRLinks = await getExistingPRLinks(thread);

  try {
    const prs = await fetchPullRequests(env.auth_token);
    const { activeCount, wipCount, haltedCount, filteredPRs } =
      categorizePRs(prs);

    await postNewPRs(filteredPRs, existingPRLinks, thread);
    logFooter({ activeCount, wipCount, haltedCount });
  } catch (err) {
    console.error("PR command failed:", err);
  }
}
