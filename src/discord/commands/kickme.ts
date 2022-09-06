import { AudioPlayerState, AudioPlayerStatus } from "@discordjs/voice"
import { ApplicationCommandOptionType, CommandInteraction, GuildMember, Message, VoiceBasedChannel } from "discord.js"
import { error, ERRORS, getPlayer, reply } from "../util"
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

    run: async (ctx: CommandInteraction | Message) => {
        if (!ctx.guild || !ctx.member) return;
        const guild = ctx.guild;
        const member = ctx.member as GuildMember;
        // Argument Processing
        let arg1: string | undefined = ctx instanceof CommandInteraction ?
            ctx.options.get("timeout",true).value?.toString().trim() :
            ctx.content.split(/\s+/g)[2].trim();
        if (!arg1 || Number.isNaN(arg1)) return error(ctx, ERRORS.INVALID_ARGUMENTS);
        // Condition Validation
        const channel: VoiceBasedChannel | null =  member.voice.channel;
        if (!channel) return error(ctx, new Error("You aren't in a voice channel!"))
        if (channel !== guild.members.me?.voice.channel) return error(ctx, new Error("You aren't in the same channel!"))
        const mystate: AudioPlayerState | undefined = getPlayer(guild.id, false)?.state;
        if (!mystate || mystate.status !== AudioPlayerStatus.Playing) return error(ctx, new Error("No music is currently being played!"));
        // Action Execution
        let timeout = Math.abs(Number.parseInt(arg1));
        reply(ctx, `Auto-Kicking you in ${arg1} minute${timeout !== 1 ? "s" : ""}!`)
        setTimeout(() => {
            const channel: VoiceBasedChannel | null =  member.voice.channel;
            if (!channel || channel !== guild.members.me?.voice.channel) return;
            member.voice.disconnect("Auto-Kick after "+timeout+"m").catch(console.error);
        }, timeout * 60 * 1000);
    }
}