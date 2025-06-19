import { Client, GatewayIntentBits } from "discord.js";
import { DateTime } from "luxon";
import { env } from "./config/config.js";
import { schedulePRCheck } from "./scheduler/pr.js";
import { onMessageCreate } from "./events/message_create.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

client.once("ready", () => {
  const now = DateTime.now().setZone(env.timezone).toFormat(env.date_format);

  console.log(`Bot is online as ${client.user.tag} at ${now}`);
  const channel = client.channels.cache.get(env.channel_id);
  if (channel) {
    console.log(`Connected to channel: ${channel.name} (${channel.id})`);
  } else {
    console.error("Channel not found. Please check the channel ID.");
  }

  schedulePRCheck(client);
});

process.on("SIGINT", () => {
  const now = DateTime.now().setZone(env.timezone).toFormat(env.date_format);
  console.log("");
  console.log(`Bot is shutting down at ${now}`);
  client.destroy();
  process.exit();
});

client.on("messageCreate", (message) => {
  onMessageCreate(message, client);
});

client.login(env.client_token);
