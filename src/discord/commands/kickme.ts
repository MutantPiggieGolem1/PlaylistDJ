import { AudioPlayerState, AudioPlayerStatus } from "@discordjs/voice"
import { ApplicationCommandOptionType, CommandInteraction, GuildMember, VoiceBasedChannel } from "discord.js"
import { ERRORS } from "../../constants"
import { getPlayer } from "../util"
import { Command } from "./Commands"

export const KickMe: Command = {
    name: "kickme",
    description: "Kicks you from the vc after some time.",
    options: [{
        name: "timeout",
        description: "How long until kick (minutes)",
        type: ApplicationCommandOptionType.Number,
        required: true
    }],
    public: true,

    run: (ctx: CommandInteraction, {timeout}: {timeout: number}) => {
        if (!ctx.guild || !ctx.member) return Promise.reject(ERRORS.NO_GUILD);
        const guild = ctx.guild;
        const member = ctx.member as GuildMember;
        // Condition Validation
        const channel: VoiceBasedChannel | null = member.voice.channel;
        if (!channel) return ctx.reply({content:"You aren't in a voice channel!",ephemeral:true});
        if (channel !== guild.members.me?.voice.channel) return ctx.reply({content:"You aren't in the same channel!",ephemeral:true});
        const mystate: AudioPlayerState | undefined = getPlayer(guild.id, false)?.state;
        if (!mystate || mystate.status !== AudioPlayerStatus.Playing) return ctx.reply({content:"No music is currently being played!",ephemeral:true});
        if (ctx.guild.members.me?.permissions.has(BigInt(1 << 24))) return ctx.reply({content:"I don't have the permissions to kick you!",ephemeral:true})
        // Action Execution
        timeout = Math.abs(timeout);
        setTimeout(() => {
            if (!member.voice.channel) return;
            member.voice.disconnect("Auto-Kick after "+timeout+"m").catch(console.warn);
        }, timeout * 60 * 1000);
        return ctx.reply({content:`Auto-Kicking you in ${timeout} minute${timeout !== 1 ? "s" : ""}!`, ephemeral:true});
    }
}