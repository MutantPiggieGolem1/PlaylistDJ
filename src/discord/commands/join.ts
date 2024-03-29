import { VoiceConnection, joinVoiceChannel } from "@discordjs/voice";
import { ApplicationCommandOptionType, ChannelType, CommandInteraction, GuildBasedChannel, VoiceBasedChannel } from "discord.js"
import { ERRORS } from '../../constants';
import { onJoin } from '../voicecmds/voicecmds';
import { Command } from "./Commands";

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

    run: (ctx: CommandInteraction, {channel}: {channel: GuildBasedChannel}) => {
        if (!ctx.guild?.available) return Promise.reject(ERRORS.NO_GUILD);
        // Argument Processing
        if (!channel.isVoiceBased() || !channel?.joinable) return ctx.reply({content:"Couldn't join voice channel!",ephemeral:true});
        // Action Execution
        onJoin(channel);
        return channel.bitrate < 16000 ? ctx.reply({content: `Warning! This channel's bitrate is low; audio quality may be decreased.`, ephemeral: false})
        : ctx.reply({content:"Joined "+channel.toString(), ephemeral: true})
    }
};

export function join(channel: VoiceBasedChannel, deaf: boolean = true): VoiceConnection {
    return joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfMute: false,
        selfDeaf: deaf,
    });
}