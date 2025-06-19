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

  try {
    const prs = await fetchPullRequests(env.auth_token);
    const { activeCount, wipCount, haltedCount, filteredPRs } =
      categorizePRs(prs);

    if (filteredPRs.length === 0) {
      logFooter({ activeCount, wipCount, haltedCount });
      console.log(
        "There are no active pull requests. Skipping thread creation."
      );
      return;
    }

    const threadName =
      DateTime.now().setZone(env.timezone).toISODate() + " Pull requests!";
    const thread = await getOrCreateThread(message, threadName);
    const existingPRLinks = await getExistingPRLinks(thread);

    await postNewPRs(filteredPRs, existingPRLinks, thread);
    logFooter({ activeCount, wipCount, haltedCount });
  } catch (err) {
    console.error("PR command failed:", err);
  }
}
