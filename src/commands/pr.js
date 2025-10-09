import { SlashCommandBuilder, MessageFlagsBitField } from "discord.js";
import { DateTime } from "luxon";
import { env } from "../config/config.js";
import { logHeader, logFooter } from "../utils/logger.js";
import {
  updateClosedPRMessages,
  getOrCreateThread,
  getExistingPRLinks,
  postNewPRs,
  notifyError,
} from "../services/discord.js";
import { fetchPullRequests, categorizePRs } from "../services/bitbucket.js";

export default {
  data: new SlashCommandBuilder()
    .setName("pr")
    .setDescription("Fetch and post the latest pull requests"),

  async execute(interaction, client) {
    // Defer reply as it might take some time
    await interaction.deferReply({
      flags: MessageFlagsBitField.Flags.Ephemeral,
    });

    logHeader(interaction);

    const threadName =
      DateTime.now().setZone(env.timezone).toISODate() + " Pull requests!";

    let thread;
    try {
      thread = await getOrCreateThread(interaction.channel, threadName);
    } catch (err) {
      console.error("❌ PR command failed: ", err);
      await notifyError(
        client,
        env.user_id,
        err,
        "Getting or creating thread failed"
      );
      return await interaction.editReply({
        content: "❌ Failed to get or create the PR thread.",
      });
    }

    let existingPRLinks;
    try {
      existingPRLinks = await getExistingPRLinks(thread);
    } catch (err) {
      console.error("❌ PR command failed: ", err);
      await notifyError(
        client,
        env.user_id,
        err,
        "Fetching existing PR links failed"
      );
      return await interaction.editReply({
        content: "❌ Failed to fetch existing PR links.",
      });
    }

    let activeCount, wipCount, haltedCount, filteredPRs;
    try {
      const prs = await fetchPullRequests(env.auth_token);
      ({ activeCount, wipCount, haltedCount, filteredPRs } =
        categorizePRs(prs));
    } catch (err) {
      console.error("❌ PR command failed:", err);
      await notifyError(client, env.user_id, err, "Failed to fetch PRs");
      return await interaction.editReply({
        content: "❌ Failed to fetch pull requests.",
      });
    }

    if (!filteredPRs || filteredPRs.length === 0) {
      console.info(
        "ℹ️ There are no new pull requests to post. But will check if any existing PRs status changed."
      );
      await updateClosedPRMessages([], existingPRLinks, client);
      logFooter({ activeCount, wipCount, haltedCount });
      const now = new Date().toLocaleTimeString();
      return await interaction.editReply({
        content: `ℹ️ No new pull requests found as of ${now}.`,
      });
    }

    try {
      await postNewPRs(filteredPRs, existingPRLinks, thread, client);
    } catch (err) {
      console.error("❌ PR command failed:", err);
      await notifyError(client, env.user_id, err, "Failed to post new PRs");
      return await interaction.editReply({
        content: "❌ Failed to post new pull requests.",
      });
    }

    logFooter({ activeCount, wipCount, haltedCount });

    const now = new Date().toLocaleTimeString();

    await interaction.editReply({
      content: `✅ Active Pull Request list has been updated successfully at ${now}!`,
    });
  },
};
