import { SlashCommandBuilder, MessageFlagsBitField } from "discord.js";
import { DateTime } from "luxon";
import { env } from "../config/config.js";
import { logHeader, logFooter } from "../utils/logger.js";
import {
  updateActivePRMessages,
  getThread,
  createThread,
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

    let thread;
    thread = await getThread(interaction.channel, threadName);
    if (filteredPRs.length > 0 && !thread) {
      try {
        console.info(
          `🔵 No existing thread named "${threadName}" found. Creating a new one...`,
        );
        thread = await createThread(interaction.channel, threadName);
      } catch (err) {
        console.error("❌ PR command failed: ", err);
        await notifyError(
          client,
          env.user_id,
          err,
          "Getting or creating thread failed",
        );
        return await interaction.editReply({
          content: "❌ Failed to get or create the PR thread.",
        });
      }
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
        "Fetching existing PR links failed",
      );
      return await interaction.editReply({
        content: "❌ Failed to fetch existing PR links.",
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

    if (existingPRLinks.size >= 1) {
      console.info(
        "🔵 Active pull requests already exist in the thread. Checking for changes.",
      );
      let count;
      count = await updateActivePRMessages([], existingPRLinks, client);
      logFooter({ activeCount, wipCount, haltedCount });
      const now = new Date().toLocaleTimeString();
      if (count > 0) {
        console.info(`🔵 Updated status of ${count} active pull request(s).`);
        return await interaction.editReply({
          content: `🔵 Updated status of ${count} active pull request(s) as of ${now}.`,
        });
      } else {
        console.info("🔵 All active pull requests are already up to date.");
        return await interaction.editReply({
          content: `🔵 There was none active pull request(s) that needed updating as of ${now}.`,
        });
      }
    }

    logFooter({ activeCount, wipCount, haltedCount });

    const now = new Date().toLocaleTimeString();

    await interaction.editReply({
      content: `✅ Active Pull Request list has been updated successfully at ${now}!`,
    });
  },
};
