import { DiscordGatewayAdapterCreator, joinVoiceChannel } from '@discordjs/voice'
import { ApplicationCommandOptionType, ChannelType, CommandInteraction, GuildBasedChannel, Message, StageChannel, VoiceChannel } from "discord.js"
import { ERRORS } from '../../constants';
import { error, reply } from "../util"
import { Command } from "./Commands"

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
        if (!ctx.guild?.available) return Promise.reject(ERRORS.NO_GUILD);
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
        return voicechannel.bitrate < 16000 ? reply(ctx, {content: `Warning! This channel's bitrate is low; audio quality may be decreased.`, ephemeral: false})
        : ctx instanceof CommandInteraction ? ctx.reply({content:"Joined "+voicechannel.toString(), ephemeral: true}).then(()=>{})
        : Promise.resolve();
    }
};