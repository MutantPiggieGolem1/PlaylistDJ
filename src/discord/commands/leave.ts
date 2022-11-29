import { AudioPlayer, getVoiceConnection, VoiceConnection } from "@discordjs/voice"
import { CommandInteraction, VoiceBasedChannel } from "discord.js"
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
        const guildid = ctx.guild.id;
        try {
            return (ctx.guild.members.me ? Promise.resolve(ctx.guild.members.me) : ctx.guild.members.fetchMe() ).then(me => {
                const voicechannel: VoiceBasedChannel | null | undefined = me.voice.channel
                if (!voicechannel) return ctx.reply({content:ERRORS.NO_CONNECTION,ephemeral:true});
                leave(guildid);
                if (ctx instanceof CommandInteraction) return ctx.reply({content:"Left "+voicechannel.toString(),ephemeral:true});
            })
        } catch (e) {return ctx.reply({content:(e as Error).message,ephemeral:true})}
    }
}

export function leave(guildid: string) {
    let player: AudioPlayer | undefined = getPlayer(guildid, false);
    player?.removeAllListeners().stop();
    let voiceconnection: VoiceConnection | undefined = getVoiceConnection(guildid)
    if (!voiceconnection?.disconnect()) throw new Error("Failed to leave voice channel.");
}