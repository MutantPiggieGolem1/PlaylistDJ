import { AudioPlayer, getVoiceConnection, VoiceConnection } from "@discordjs/voice";
import { CommandInteraction, Message, VoiceBasedChannel } from "discord.js";
import { error, ERRORS, getPlayer } from "../util";
import { Command } from "./Commands";
import { timeouts } from "./play";

export const Leave: Command = {
    name: "leave",
    description: "Leaves the voice channel and stops playing",
    defaultMemberPermissions: "ManageChannels",
    public: true,

    run: async (ctx: CommandInteraction | Message) => {
        if (!ctx.guild) return;
        let voicechannel: VoiceBasedChannel | null | undefined = ( ctx.guild.members.me ?? await ctx.guild.members.fetchMe() ).voice.channel
        if (!voicechannel) return error(ctx,ERRORS.NO_CONNECTION);
        try {
            leave(ctx)
            if (ctx instanceof CommandInteraction) ctx.reply({content:"Left "+voicechannel.toString(),ephemeral: true});
        } catch (e) {error(ctx,e as Error)}
    }
}

export function leave(ctx: CommandInteraction | Message) {
    if (!ctx.guild) return;
    
    delete timeouts[ctx.guild.id];
    let player: AudioPlayer | undefined = getPlayer(ctx.guild.id, false);
    player?.removeAllListeners().stop();
    let voiceconnection: VoiceConnection | undefined = getVoiceConnection(ctx.guild.id)
    if (!voiceconnection?.disconnect()) throw new Error("Failed to leave voice channel.");
}