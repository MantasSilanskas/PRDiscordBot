import { handlePRCommand } from "../commands/pr.js";
import { handleDeleteMsgCommand } from "../commands/delete_message.js";

const PREFIX = "!";

export async function onMessageCreate(message, client) {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "pr") {
    await handlePRCommand(message, client);
  } else if (command === "deletemsg") {
    await handleDeleteMsgCommand(message, args, client);
  }
}
