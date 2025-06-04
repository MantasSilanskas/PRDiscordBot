import { Client, GatewayIntentBits, roleMention } from "discord.js";
import fetch from "node-fetch";
import { DateTime } from "luxon";
import { env } from "./config/config.js";

const PREFIX = "!";
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

let prInterval;
let hasSchedulerRunOnce = false;

client.once("ready", () => {
  const now = DateTime.now().setZone(env.timezone).toFormat(env.date_format);

  console.log(`Bot is online as ${client.user.tag} at ${now}`);
  const channel = client.channels.cache.get(env.channel_id);
  if (channel) {
    console.log(`Connected to channel: ${channel.name} (${channel.id})`);
  } else {
    console.error("Channel not found. Please check the channel ID.");
  }

  schedulePRCheck();
});

process.on("SIGINT", () => {
  const now = DateTime.now().setZone(env.timezone).toFormat(env.date_format);
  console.log("");
  console.log(`Bot is shutting down at ${now}`);
  client.destroy();
  process.exit();
});

client.login(env.client_token);

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "pr") {
    await handlePRCommand(message);
  }

  if (command === "deletemsg") {
    await handleDeleteMsgCommand(message, args);
  }
});

// ================================Command Handlers=============================
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

async function handleDeleteMsgCommand(message, args) {
  const messageId = args[0];
  const channel = message.channel;

  if (!channel?.isThread()) {
    console.log("This command must be run in a thread.");
    await message.reply("Please run this command inside a thread.");
    return;
  }

  if (!messageId) {
    await message.reply("Please provide a message ID to delete.");
    return;
  }

  try {
    await message.delete();
    await deleteMessageInThread(channel, messageId);
  } catch (error) {
    console.error("Error handling deletemsg command:", error);
  }
}

//================================Discord Utilities=============================
async function schedulePRCheck() {
  if (shouldSkipFirstRun()) {
    scheduleNextRun(15 * 60 * 1000);
    return;
  }

  const nowInVilnius = DateTime.now().setZone(env.timezone);

  if (isOutsideWorkingHours(nowInVilnius)) {
    scheduleRunAtNextWorkingHour(nowInVilnius);
    return;
  }

  const channel = getTargetChannel("930724186157088798");
  if (!channel) return;

  const fakeMessage = createFakeMessage(channel);

  await handlePRCommand(fakeMessage);

  scheduleNextRun(15 * 60 * 1000);
}

async function deleteMessageInThread(threadChannel, messageId) {
  try {
    const messageToDelete = await threadChannel.messages.fetch(messageId);
    if (messageToDelete) {
      await messageToDelete.delete();
      console.log(`Message ${messageId} deleted from thread.`);
    } else {
      console.warn(`Message ${messageId} not found in thread.`);
    }
  } catch (err) {
    console.error(`Failed to delete message ${messageId} in thread:`, err);
  }
}

async function getOrCreateThread(message, threadName) {
  let thread = message.channel.threads.cache.find((t) => t.name === threadName);

  if (!thread) {
    thread = await message.channel.threads.create({ name: threadName });
    await thread.send(roleMention(env.role_id));
  }

  return thread;
}

async function getExistingPRLinks(thread) {
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

async function postNewPRs(prs, existingPRMap, thread) {
  await postNewPRMessages(prs, existingPRMap, thread);
  await updateClosedPRMessages(prs, existingPRMap);
}

//====================================Utilities=================================
function logHeader(message) {
  const now = DateTime.now().setZone(env.timezone).toFormat(env.date_format);
  console.log("=".repeat(97));
  console.log(
    `========== Date: ${now} Call ID: ${message.id} User: ${message.author.username} ==========`
  );
}

function logFooter({ activeCount, wipCount, haltedCount }) {
  console.log(
    `====================== Pull request Summary: Active: ${activeCount} WIP: ${wipCount} Halted PRs: ${haltedCount} =====================`
  );
  console.log("=".repeat(97));
  console.log("");
}

async function postNewPRMessages(prs, existingPRMap, thread) {
  for (const pr of prs) {
    if (pr.state !== "OPEN") continue;
    const url = pr.links.html.href;
    if (existingPRMap.has(url)) continue;

    await thread.send(
      `[${pr.title}]\nAuthor: ${pr.author.display_name}\n${url}\n`
    );
  }
}

async function updateClosedPRMessages(prs, existingPRMap) {
  const openUrls = new Set(prs.map((pr) => pr.links.html.href));

  for (const [url, msg] of existingPRMap.entries()) {
    if (openUrls.has(url)) continue;

    try {
      const prInfo = await fetchPullRequestDetails(url, env.auth_token);
      if (!["MERGED", "DECLINED"].includes(prInfo.state)) continue;

      const newContent = formatStatusMessage(prInfo);
      if (msg.content === newContent) continue;

      await msg.edit(newContent);
      console.log(`Updated PR (${url}) as ${prInfo.state}`);
    } catch (err) {
      console.error(`Failed to fetch/update closed PR: ${url}`, err);
    }
  }
}

function shouldSkipFirstRun() {
  if (!hasSchedulerRunOnce) {
    console.log(
      `[Auto] Skipping first scheduled PR check after startup (${DateTime.now()
        .setZone(env.timezone)
        .toFormat("HH:mm:ss")})`
    );
    hasSchedulerRunOnce = true;
    return true;
  }
  return false;
}

function isOutsideWorkingHours(now) {
  const hour = now.hour;
  return hour < 8 || hour >= 17;
}

function scheduleRunAtNextWorkingHour(now) {
  let nextRun = now.set({ hour: 8, minute: 0, second: 0, millisecond: 0 });

  if (now.hour >= 17) {
    nextRun = nextRun.plus({ days: 1 });
  }

  while ([6, 7].includes(nextRun.weekday)) {
    nextRun = nextRun.plus({ days: 1 });
  }

  const msUntilNextRun = nextRun.diff(now).as("milliseconds");
  const totalMinutes = Math.round(msUntilNextRun / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  console.log(
    `[Auto] Skipping PR check: ${now.toFormat(
      "HH:mm"
    )} (outside working hours in Lithuania). Next run in ${hours} hours ${minutes} minutes.`
  );

  scheduleNextRun(msUntilNextRun);
}

function getTargetChannel(channelId) {
  const channel = client.channels.cache.get(channelId);
  if (!channel || !channel.isTextBased()) {
    console.error("Target channel not found or not text-based.");
    return null;
  }
  return channel;
}

function createFakeMessage(channel) {
  return {
    id: `AUTO-${new Date().toISOString().slice(0, 10)}`,
    author: { username: "AutoScheduler" },
    delete: async () => {},
    channel: channel,
  };
}

function scheduleNextRun(ms) {
  prInterval = setTimeout(schedulePRCheck, ms);
}
//=================================Bitbucket API================================
async function fetchPullRequests(auth_token) {
  const response = await fetch(
    "https://api.bitbucket.org/2.0/repositories/peplinkec/fusionsim-cloud/pullrequests?pagelen=50",
    {
      method: "GET",
      headers: {
        Authorization: auth_token,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  return data.values;
}

function categorizePRs(prs) {
  let activeCount = 0;
  let wipCount = 0;
  let haltedCount = 0;

  const filteredPRs = [];

  for (const pr of prs) {
    const prTitle = pr.title.toLowerCase();

    if (pr.draft) {
      wipCount++;
      console.log(
        `Skipped Draft Pull Request by ${pr.author.display_name} - ${pr.title}`
      );
      continue;
    }

    if (prTitle.includes("wip")) {
      wipCount++;
      console.log(
        `Skipped WIP Pull Request by ${pr.author.display_name} - ${pr.title}`
      );
      continue;
    }

    if (prTitle.includes("halt")) {
      haltedCount++;
      console.log(
        `Skipped Halted Pull Request by ${pr.author.display_name} - ${pr.title}`
      );
      continue;
    }

    activeCount++;
    filteredPRs.push(pr);
  }

  return { activeCount, wipCount, haltedCount, filteredPRs };
}

async function fetchPullRequestDetails(prUrl, auth_token) {
  const match = prUrl.match(
    /bitbucket\.org\/([^\/]+)\/([^\/]+)\/pull-requests\/(\d+)/
  );

  if (!match) throw new Error(`Invalid PR URL: ${prUrl}`);

  const [, workspace, repoSlug, prId] = match;

  const response = await fetch(
    `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/pullrequests/${prId}`,
    {
      method: "GET",
      headers: {
        Authorization: auth_token,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch PR details. Status: ${response.status}`);
  }

  return await response.json();
}

function extractPRStatus(prInfo) {
  const approvers = prInfo.participants
    .filter((p) => p.approved)
    .map((p) => p.user.display_name);

  const closer = prInfo.closed_by?.display_name || "Unknown";
  const declineReason = prInfo.reason || "No reason provided";

  return { approvers, closer, declineReason };
}

function formatStatusMessage(prInfo) {
  const { approvers, closer, declineReason } = extractPRStatus(prInfo);
  const titleLine = `[${prInfo.title}]\nAuthor: ${prInfo.author.display_name}`;
  const urlLine = prInfo.links.html.href;

  if (prInfo.state === "MERGED") {
    return [
      "✅ Merged ✅",
      `Approved by: ${approvers.join(", ") || "None"}`,
      titleLine,
      urlLine,
    ].join("\n");
  }

  return [
    "❌ Declined ❌",
    `Declined by: ${closer}`,
    `Reason: ${declineReason}`,
    titleLine,
    urlLine,
  ].join("\n");
}
