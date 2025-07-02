import { DateTime } from "luxon";
import { env } from "../config/config.js";
import { logHeader, logFooter } from "../utils/logger.js";
import {
  getOrCreateThread,
  getExistingPRLinks,
  postNewPRs,
  notifyError,
} from "../services/discord.js";
import { fetchPullRequests, categorizePRs } from "../services/bitbucket.js";

export async function handlePRCommand(message, client) {
  logHeader(message);

  const threadName =
    DateTime.now().setZone(env.timezone).toISODate() + " Pull requests!";

  let thread;
  try {
    thread = await getOrCreateThread(message, threadName);
  } catch (err) {
    console.error("PR command failed: ", err);
    await notifyError(
      client,
      env.user_id,
      err,
      "Getting or creating thread failed"
    );
  }

  let existingPRLinks;
  try {
    existingPRLinks = await getExistingPRLinks(thread);
  } catch (err) {
    console.error("PR command failed: ", err);
    await notifyError(
      client,
      env.user_id,
      err,
      "Fetching existing PR links failed"
    );
  }

  let activeCount, wipCount, haltedCount, filteredPRs;
  try {
    const prs = await fetchPullRequests(env.auth_token);
    ({ activeCount, wipCount, haltedCount, filteredPRs } = categorizePRs(prs));
  } catch (err) {
    console.error("PR command failed:", err);
    await notifyError(client, env.user_id, err, "Failed to fetch PRs");
  }

  try {
    await postNewPRs(filteredPRs, existingPRLinks, thread, client);
  } catch (err) {
    console.error("PR command failed:", err);
    await notifyError(client, env.user_id, err, "Failed to post new PRs");
  }

  logFooter({ activeCount, wipCount, haltedCount });

  await message.delete();
}
