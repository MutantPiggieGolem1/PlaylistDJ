import { getVoiceConnection, joinVoiceChannel, VoiceConnection } from "@discordjs/voice";
import { BaseCommandInteraction, Message, VoiceBasedChannel } from "discord.js";
import { reply } from "../util";
import { Command } from "./Commands";

export const Leave: Command = {
    name: "leave",
    description: "Leaves the voice channel and stops playing",
    type: "CHAT_INPUT",

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild?.available) return;
        let voicechannel: VoiceBasedChannel | null | undefined = ctx.guild.me?.voice.channel
        if (!voicechannel) return reply(ctx,"Couldn't find voice channel!");
        let voiceconnection: VoiceConnection = 
            getVoiceConnection(ctx.guild.id) ??
            joinVoiceChannel({channelId: voicechannel.id,guildId: voicechannel.guild.id,adapterCreator: voicechannel.guild.voiceAdapterCreator,selfMute: true,selfDeaf: true,})
        if (voiceconnection?.disconnect()) return reply(ctx,"Left "+voicechannel?.toString());
        reply(ctx, "Failed to leave voice channel.");
    }
};