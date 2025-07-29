import { SlashCommandBuilder } from "discord.js";
import { deleteMessageInThread, notifyError } from "../services/discord.js";
import { env } from "../config/config.js";

export default {
  data: new SlashCommandBuilder()
    .setName("deletemsg")
    .setDescription("Delete a message inside the current thread by message ID")
    .addStringOption((option) =>
      option
        .setName("messageid")
        .setDescription("The ID of the message to delete")
        .setRequired(true)
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const messageId = interaction.options.getString("messageid");
    const channel = interaction.channel;

    if (!channel?.isThread()) {
      await interaction.editReply(
        "❌ This command must be run inside a thread."
      );
      return;
    }

    try {
      await deleteMessageInThread(channel, messageId);

      await interaction.editReply(
        `✅ Message with ID \`${messageId}\` deleted successfully.`
      );
    } catch (error) {
      console.error("❌ Error handling deletemsg command:", error);
      await notifyError(
        client,
        env.user_id,
        error,
        "Failed to handle /deletemsg command"
      );

      await interaction.editReply(
        "❌ Failed to delete the message. Please check the ID and try again."
      );
    }
  },
};
