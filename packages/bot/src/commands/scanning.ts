import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { setChannel } from "../api";

const NOT_LINKED_MESSAGE =
  "This server isn't linked yet - run `/link <code>` first (generate a code from Magic Vault's Settings page).";

export const data = new SlashCommandBuilder()
  .setName("scanning")
  .setDescription("Set the channel for Magic Vault card-scan notifications")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption((opt) =>
    opt
      .setName("channel")
      .setDescription("Channel to post card scans in (defaults to this channel)")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({
      content: "This command only works in a server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const channel = interaction.options.getChannel("channel") ?? interaction.channel;
  if (!channel || channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: "Pick a text channel for this.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const result = await setChannel(interaction.guildId, channel.id, "scan");
  if (!result.success) {
    await interaction.editReply(
      result.message === "not_linked" ? NOT_LINKED_MESSAGE : "Couldn't save that.",
    );
    return;
  }

  await interaction.editReply(`Card scans will now be posted in <#${channel.id}>.`);
}
