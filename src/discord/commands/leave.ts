import { AudioPlayer, getVoiceConnection, VoiceConnection } from "@discordjs/voice"
import { CommandInteraction, Message, VoiceBasedChannel } from "discord.js"
import { ERRORS } from "../../constants"
import { getPlayer } from "../util"
import { Command } from "./Commands"

export const Leave: Command = {
    name: "leave",
    description: "Leaves the voice channel and stops playing",
    defaultMemberPermissions: "ManageChannels",
    public: true,

    run: (ctx: CommandInteraction) => {
        if (!ctx.guild) return Promise.reject(ERRORS.NO_GUILD);
        try {
            return (ctx.guild.members.me ? Promise.resolve(ctx.guild.members.me) : ctx.guild.members.fetchMe() ).then(me => {
                const voicechannel: VoiceBasedChannel | null | undefined = me.voice.channel
                if (!voicechannel) return ctx.reply({content:ERRORS.NO_CONNECTION,ephemeral:true});
                leave(ctx);
                if (ctx instanceof CommandInteraction) return ctx.reply({content:"Left "+voicechannel.toString(),ephemeral:true});
            })
        } catch (e) {return ctx.reply({content:(e as Error).message,ephemeral:true})}
    }
}

export function leave(ctx: CommandInteraction | Message | string) {
    const gid = typeof ctx === "string" ? ctx : ctx.guild?.id;
    if (!gid) return;
    
    let player: AudioPlayer | undefined = getPlayer(gid, false);
    player?.removeAllListeners().stop();
    let voiceconnection: VoiceConnection | undefined = getVoiceConnection(gid)
    if (!voiceconnection?.disconnect()) throw new Error("Failed to leave voice channel.");
}