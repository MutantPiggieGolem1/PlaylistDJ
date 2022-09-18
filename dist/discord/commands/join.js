"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Join = void 0;
const voice_1 = require("@discordjs/voice");
const discord_js_1 = require("discord.js");
const util_1 = require("../util");
exports.Join = {
    name: "join",
    description: "Joins a voice channel.",
    options: [{
            name: "channel",
            description: "Voice channel to join",
            type: discord_js_1.ApplicationCommandOptionType.Channel,
            channelTypes: [
                discord_js_1.ChannelType.GuildVoice,
                discord_js_1.ChannelType.GuildStageVoice
            ],
            required: true
        }],
    defaultMemberPermissions: "ManageChannels",
    public: true,
    run: (ctx) => {
        if (!ctx.guild?.available)
            return;
        let voicechannel = ctx instanceof discord_js_1.CommandInteraction ?
            ctx.options.get("channel", true).channel : (() => {
            let arg1 = ctx.content.split(/\s+/g).slice(2).join(" ");
            return ctx.guild.channels.resolve(arg1.replaceAll(/\D/g, "")) ??
                ctx.guild.channels.cache.find(c => c.isVoiceBased() && c.name.toLowerCase() === arg1.toLowerCase()) ??
                ctx.member?.voice?.channel;
        })();
        if (!(voicechannel instanceof discord_js_1.VoiceChannel || voicechannel instanceof discord_js_1.StageChannel) || !voicechannel?.joinable)
            return (0, util_1.error)(ctx, new Error("Couldn't join voice channel!"));
        (0, voice_1.joinVoiceChannel)({
            channelId: voicechannel.id,
            guildId: voicechannel.guild.id,
            adapterCreator: voicechannel.guild.voiceAdapterCreator,
            selfMute: false,
            selfDeaf: true,
        });
        if (voicechannel.bitrate < 16000)
            (0, util_1.reply)(ctx, { content: `Warning! This channel's bitrate is low; audio quality may be decreased.`, ephemeral: false });
        else if (ctx instanceof discord_js_1.CommandInteraction)
            ctx.reply({ content: "Joined " + voicechannel.toString(), ephemeral: true });
    }
};
