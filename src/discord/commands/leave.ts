import { AudioPlayer, getVoiceConnection, VoiceConnection } from "@discordjs/voice"
import { CommandInteraction, Message, VoiceBasedChannel } from "discord.js"
import { ERRORS } from "../../constants"
import { error, getPlayer } from "../util"
import { Command } from "./Commands"

export const Leave: Command = {
    name: "leave",
    description: "Leaves the voice channel and stops playing",
    defaultMemberPermissions: "ManageChannels",
    public: true,

    run: (ctx: CommandInteraction | Message) => {
        if (!ctx.guild) return Promise.reject(ERRORS.NO_GUILD);
        try {
            return (ctx.guild.members.me ? Promise.resolve(ctx.guild.members.me) : ctx.guild.members.fetchMe() ).then(me => {
                const voicechannel: VoiceBasedChannel | null | undefined = me.voice.channel
                if (!voicechannel) return error(ctx, ERRORS.NO_CONNECTION);
                leave(ctx)
                if (ctx instanceof CommandInteraction) return ctx.reply({content:"Left "+voicechannel.toString(),ephemeral: true}).then(()=>{});
            })
        } catch (e) {return error(ctx, e as Error)}
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