import { roleMention } from "discord.js";
import { env } from "../config/config.js";
import { formatStatusMessage } from "../utils/formatters.js";
import { fetchPullRequestDetails } from "./bitbucket.js";

export function getTargetChannel(client, channelId) {
  const channel = client.channels.cache.get(channelId);
  if (!channel || !channel.isTextBased()) {
    console.error("❌ Target channel not found or not text-based.");
    return null;
  }
  return channel;
}

export function createFakeMessage(channel) {
  return {
    id: `AUTO-${new Date().toISOString().slice(0, 10)}`,
    author: { username: "AutoScheduler" },
    delete: async () => {},
    channel: channel,
  };
}

export async function getOrCreateThread(channel, threadName) {
  let thread;

  if (channel.isThread()) {
    thread = channel;
  } else {
    thread = channel.threads.cache.find((t) => t.name === threadName);
  }

  if (!thread) {
    thread = await channel.threads.create({ name: threadName });
    await thread.send(roleMention(env.role_id));
  }

  return thread;
}

export async function getExistingPRLinks(thread) {
  const existingMessages = await thread.messages.fetch({ limit: 100 });
  const linkMap = new Map();

  existingMessages.forEach((msg) => {
    const urlMatch = msg.content.match(/https:\/\/bitbucket\.org\/[^\s]+/);
    if (urlMatch) {
      linkMap.set(urlMatch[0], msg);
    }
  });

  return linkMap;
}

export async function postNewPRs(prs, existingPRMap, thread, client) {
  await postNewPRMessages(prs, existingPRMap, thread);
  await updateClosedPRMessages(prs, existingPRMap, client);
}

async function postNewPRMessages(prs, existingPRMap, thread) {
  for (const pr of prs) {
    if (pr.state !== "OPEN") continue;
    const url = pr.links.html.href;
    if (existingPRMap.has(url)) continue;
    if (pr.draft) {
      continue;
    }

    await thread.send(
      `[${pr.title}]\nAuthor: ${pr.author.display_name}\n${url}\n`
    );
  }
}

async function updateClosedPRMessages(prs, existingPRMap, client) {
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
        `✅ Updated Pull Request by ${prInfo.author.display_name} - ${prInfo.title} as ${prInfo.state}`
      );
    } catch (err) {
      console.error(`❌ Failed to fetch/update closed PR: ${url}`, err);
    }
  }
}

export async function deleteMessageInThread(threadChannel, messageId) {
  try {
    const messageToDelete = await threadChannel.messages.fetch(messageId);
    if (messageToDelete) {
      await messageToDelete.delete();
      console.log(`✅ Message ${messageId} deleted from thread.`);
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
