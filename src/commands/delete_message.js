import { deleteMessageInThread } from "../services/discord.js";

export async function handleDeleteMsgCommand(message, args) {
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
