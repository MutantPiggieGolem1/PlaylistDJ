import { BaseCommandInteraction, Channel, Client, GuildBasedChannel, Message, VoiceChannel } from "discord.js";
import { ChannelTypes } from "discord.js/typings/enums";
import { Command } from "./Command";
import { joinVoiceChannel, VoiceConnection } from '@discordjs/voice';
import { reply } from "../util";

function joinVC(vc: VoiceChannel): VoiceConnection {
    return joinVoiceChannel({
        channelId: vc.id,
        guildId: vc.guild.id,
        adapterCreator: vc.guild.voiceAdapterCreator,
        selfMute: false,
        selfDeaf: true,
    });
}

export const Join: Command = {
    name: "join",
    description: "Joins a voice channel",
    type: "CHAT_INPUT",
    options: [
        {
            name: "channel",
            description: "Voice channel to join",
            type: 7, // ApplicationCommandOptionType.CHANNEL
            channelTypes: [
                ChannelTypes.GUILD_VOICE,
                // ChannelTypes.GUILD_STAGE_VOICE
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
            let arg1: string = ctx.content.split(" ")[2];
            if (!arg1) {ctx.reply("Invalid arguments!"); return;}

            let vcid: string = arg1.replaceAll(/\D/g,"");
            
            if (vcid.length === 18 && Number.isInteger(vcid)) {
                voicechannel = ctx.guild.channels.resolve(vcid);
            } else {
                voicechannel = ctx.guild.channels.cache.find(c=>c.name===arg1)
            }
        }
        if (!voicechannel || !(voicechannel instanceof VoiceChannel)) {await reply(ctx,"Couldn't find voice channel!"); return;}
        if (!voicechannel.joinable) {await reply(ctx,"Couldn't join voice channel! (Insufficent Permissions)"); return;}
        joinVC(voicechannel);
        reply(ctx, "Joined "+voicechannel.toString());
    }
};