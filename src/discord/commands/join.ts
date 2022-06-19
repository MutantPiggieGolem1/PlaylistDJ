import { BaseCommandInteraction, Message, VoiceChannel } from "discord.js";
import { ChannelTypes } from "discord.js/typings/enums";
import { Command } from "./Commands";
import { joinVoiceChannel } from '@discordjs/voice';
import { reply } from "../util";

export const Join: Command = {
    name: "join",
    description: "Joins a voice channel.",
    type: "CHAT_INPUT",
    public: true,
    options: [
        {
            name: "channel",
            description: "Voice channel to join",
            type: 7, // ApplicationCommandOptionType.CHANNEL
            channelTypes: [
                ChannelTypes.GUILD_VOICE,
                ChannelTypes.GUILD_STAGE_VOICE
            ],
            required: true
        }
    ],

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild?.available) return;
        let voicechannel;
        if (ctx instanceof BaseCommandInteraction) { // slash command
            voicechannel = ctx.options.get("channel",true).channel;
        } else if (ctx instanceof Message) { // normal command
            let arg1: string = ctx.content.split(" ").slice(2).join(" ");
            if (arg1) {
                let vcid: string = arg1.replaceAll(/\D/g,"");
                
                if (vcid.length === 18 && !Number.isNaN(vcid)) {
                    voicechannel = ctx.guild.channels.resolve(vcid);
                } else {
                    voicechannel = ctx.guild.channels.cache.find(c=>c.isVoice()&&c.name.toLowerCase()===arg1.toLowerCase())
                }
            }
            if (!voicechannel && ctx.member) {
                voicechannel = ctx.member.voice.channel;
            }
        }
        if (!voicechannel || !(voicechannel instanceof VoiceChannel)) {await reply(ctx,"Couldn't find voice channel!"); return;}
        if (!voicechannel.joinable) {await reply(ctx,"Couldn't join voice channel! (Insufficent Permissions)"); return;}
        joinVoiceChannel({
            channelId: voicechannel.id,
            guildId: voicechannel.guild.id,
            adapterCreator: voicechannel.guild.voiceAdapterCreator,
            selfMute: false,
            selfDeaf: true,
        });
        reply(ctx, "Joined "+voicechannel.toString());
    }
};