import { roleMention } from "discord.js";
import { env } from "../config/config.js";
import { formatStatusMessage } from "../utils/formatters.js";
import { fetchPullRequestDetails } from "./bitbucket.js";

export function getTargetChannel(client, channelId) {
  const channel = client.channels.cache.get(channelId);

  if (!channel?.isTextBased?.()) {
    console.error(
      `❌ Invalid target channel (${channelId}): not found or not text-based.`
    );
    return null;
  }

  return channel;
}

export async function getOrCreateThread(channel, threadName) {
  if (channel.isThread() && channel.name === threadName) {
    return channel;
  }

  const existingThread = channel.threads?.cache?.find(
    (t) => t.name === threadName
  );
  if (existingThread) {
    return existingThread;
  }

  try {
    const newThread = await channel.threads.create({ name: threadName });
    await newThread.send(roleMention(env.role_id));
    return newThread;
  } catch (error) {
    console.error(
      `❌ Failed to create or send message to thread "${threadName}":`,
      error
    );
    throw error;
  }
}

export async function getExistingPRLinks(thread) {
  try {
    const messages = await thread.messages.fetch({ limit: 100 });
    const linkMap = new Map();

    for (const message of messages.values()) {
      const match = message.content.match(
        /https:\/\/bitbucket\.org\/[\w-]+\/[\w-]+\/pull-requests\/\d+/i
      );
      if (match) {
        linkMap.set(match[0], message);
      }
    }

    return linkMap;
  } catch (error) {
    console.error(
      `❌ Failed to fetch messages from thread "${thread.name}":`,
      error
    );
    return new Map();
  }
}

export async function postNewPRs(prs, existingPRMap, thread, client) {
  await postNewPRMessages(prs, existingPRMap, thread);
  await updateClosedPRMessages(prs, existingPRMap, client);
}

export async function postNewPRMessages(prs, existingPRMap, thread) {
  const newPRs = prs.filter(
    (pr) =>
      pr.state === "OPEN" && !pr.draft && !existingPRMap.has(pr.links.html.href)
  );

  await Promise.all(
    newPRs.map(async (pr) => {
      try {
        const title = pr.title?.trim() || "Untitled PR";
        const author = pr.author?.display_name?.trim() || "Unknown";
        const url = pr.links.html.href;

        await thread.send(`[${title}]\nAuthor: ${author}\n${url}\n`);
      } catch (error) {
        console.error(`❌ Failed to send message for PR "${pr.title}":`, error);
      }
    })
  );
}

export async function updateClosedPRMessages(prs, existingPRMap, client) {
  const openUrls = new Set(prs.map((pr) => pr.links.html.href));

  for (const [url, msg] of existingPRMap.entries()) {
    if (msg.author.id !== client.user.id) continue;

    if (openUrls.has(url)) continue;

    try {
      const prInfo = await fetchPullRequestDetails(url, env.auth_token);

      if (!["MERGED", "DECLINED"].includes(prInfo.state)) continue;

      const newContent = formatStatusMessage(prInfo);

      if (msg.content === newContent) continue;

      await msg.edit(newContent);

      console.log(
        `✅ Updated PR "${prInfo.title}" by ${prInfo.author.display_name} — Status: ${prInfo.state}`
      );
    } catch (err) {
      console.error(`❌ Error updating PR message for ${url}:`, err);
    }
  }
}

export async function deleteMessageInThread(threadChannel, messageId) {
  try {
    const messageToDelete = await threadChannel.messages.fetch(messageId);
    if (messageToDelete) {
      await messageToDelete.delete();
      const content = messageToDelete.content || "[No text content]";
      console.log(
        `✅ Deleted message ${messageId} from thread.\n` +
          `📝 Content:\n${content
            .split("\n")
            .map((line) => "    " + line)
            .join("\n")}`
      );
    } else {
      console.warn(`🟠 Message ${messageId} not found in thread.`);
    }
  } catch (err) {
    console.error(`❌ Failed to delete message ${messageId} in thread:`, err);
  }
}

export async function notifyError(client, userId, error, context = "") {
  try {
    const user = await client.users.fetch(userId);
    const errorMessage = error.stack || error.message || String(error);
    const contextMessage = context ? `Context: ${context}\n` : "";

    await user.send(
      `❌ Error occurred!\n${contextMessage}\`\`\`\n${errorMessage}\n\`\`\``
    );
  } catch (dmErr) {
    console.error("❌ Failed to DM user about the error:", dmErr);
  }
}
