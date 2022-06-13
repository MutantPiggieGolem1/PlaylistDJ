import { getVoiceConnection } from "@discordjs/voice";
import { BaseCommandInteraction, Message, VoiceBasedChannel } from "discord.js";
import { reply } from "../util";
import { Command } from "./Command";

export const Leave: Command = {
    name: "leave",
    description: "Leaves the voice channel and stops playing",
    type: "CHAT_INPUT",

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild?.available) return;
        let voicechannel: VoiceBasedChannel | null | undefined = ctx.guild.me?.voice.channel
        if (getVoiceConnection(ctx.guild.id)?.disconnect()) return reply(ctx,"Left "+voicechannel?.toString());
        reply(ctx, "Failed to leave voice channel.");
    }
};