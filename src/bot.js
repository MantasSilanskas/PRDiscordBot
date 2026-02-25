import {
  Client,
  GatewayIntentBits,
  Collection,
  MessageFlagsBitField,
} from "discord.js";
import { DateTime } from "luxon";
import { env } from "./config/config.js";
import { schedulePRCheck } from "./scheduler/pr.js";
import fs from "fs";
import path from "path";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

// Initialize commands collection
client.commands = new Collection();

const commandsPath = path.join(process.cwd(), "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const commandModule = await import(filePath);
  const command = commandModule.default;
  if (command && command.data && command.execute) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`⚠️ Skipping invalid command file: ${file}`);
  }
}

client.once("clientReady", () => {
  const now = DateTime.now().setZone(env.timezone).toFormat(env.date_format);

  console.log(`✅ Bot is online as ${client.user.tag} at ${now}`);
  const channel = client.channels.cache.get(env.channel_id);
  if (channel) {
    console.log(`✅ Connected to channel: ${channel.name} (${channel.id})`);
  } else {
    console.error("❌ Channel not found. Please check the channel ID.");
  }

  schedulePRCheck(client);
});

process.on("SIGINT", () => {
  const now = DateTime.now().setZone(env.timezone).toFormat(env.date_format);
  console.log("");
  console.log(`🟠 Bot is shutting down at ${now}`);
  client.destroy();
  process.exit();
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`❌ No command matching ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(
      `❌ Error executing ${interaction.commandName}, error:`,
      error,
    );
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "❌ There was an error executing this command.",
        flags: MessageFlagsBitField.Flags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: "❌ There was an error executing this command.",
        flags: MessageFlagsBitField.Flags.Ephemeral,
      });
    }
  }
});

client.login(env.client_token);
