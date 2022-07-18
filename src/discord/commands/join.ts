import { CommandInteraction, Message, VoiceChannel, StageChannel, GuildBasedChannel, ApplicationCommandOptionType, ChannelType } from "discord.js";
import { Command } from "./Commands";
import { DiscordGatewayAdapterCreator, joinVoiceChannel } from '@discordjs/voice';
import { error } from "../util";

export const Join: Command = {
    name: "join",
    description: "Joins a voice channel.",
    options: [{
        name: "channel",
        description: "Voice channel to join",
        type: ApplicationCommandOptionType.Channel,
        channelTypes: [
            ChannelType.GuildVoice,
            ChannelType.GuildStageVoice
        ],
        required: true
    }],
    defaultMemberPermissions: "ManageChannels",
    public: true,

    run: (ctx: CommandInteraction | Message) => {
        if (!ctx.guild?.available) return;
        // Argument Processing
        let voicechannel: GuildBasedChannel | null | undefined = ctx instanceof CommandInteraction ? 
            ctx.options.get("channel",true).channel as GuildBasedChannel : (() => {
                let arg1: string = ctx.content.split(/\s+/g).slice(2).join(" ");
                return ctx.guild.channels.resolve(arg1.replaceAll(/\D/g,"")) ?? 
                    ctx.guild.channels.cache.find(c=>c.isVoiceBased()&&c.name.toLowerCase()===arg1.toLowerCase()) ??
                    ctx.member?.voice?.channel;
            })();
        if (!(voicechannel instanceof VoiceChannel || voicechannel instanceof StageChannel) || !voicechannel?.joinable) return error(ctx, new Error("Couldn't join voice channel!"));
        // Action Execution
        joinVoiceChannel({
            channelId: voicechannel.id,
            guildId: voicechannel.guild.id,
            adapterCreator: voicechannel.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
            selfMute: false,
            selfDeaf: true,
        });
        if (ctx instanceof CommandInteraction) ctx.reply({content:"Joined "+voicechannel.toString(),ephemeral: true});
    }
};