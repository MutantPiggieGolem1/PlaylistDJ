import { AudioPlayer, getVoiceConnection, VoiceConnection } from "@discordjs/voice";
import { BaseCommandInteraction, Message, VoiceBasedChannel } from "discord.js";
import { RatedSong } from "../../youtube/util";
import { error, ERRORS, getPlayer } from "../util";
import { Command } from "./Commands";

export const Leave: Command = {
    name: "leave",
    description: "Leaves the voice channel and stops playing",
    type: "CHAT_INPUT",
    public: true,

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild?.available) return;
        let voicechannel: VoiceBasedChannel | null | undefined = ctx.guild.me?.voice.channel
        if (!voicechannel) return error(ctx,ERRORS.NO_CONNECTION);
        let player: {player?: AudioPlayer,playing?: RatedSong} = getPlayer(ctx.guild.id, false);
        if (player.player) {player.player.removeAllListeners();player.player.stop();}
        player.playing = undefined;
        let voiceconnection: VoiceConnection | undefined = getVoiceConnection(ctx.guild.id)
        if (!voiceconnection?.disconnect()) return error(ctx,new Error("Failed to leave voice channel."));
        if (ctx instanceof BaseCommandInteraction) ctx.reply({content:"Left "+voicechannel.toString(),ephemeral: true});
    }
}