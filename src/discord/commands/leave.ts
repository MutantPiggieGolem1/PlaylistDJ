import { AudioPlayer, getVoiceConnection, VoiceConnection } from "@discordjs/voice";
import { BaseCommandInteraction, Message, VoiceBasedChannel } from "discord.js";
import { RealSong } from "../../youtube/util";
import { getPlayer, reply } from "../util";
import { Command } from "./Commands";

export const Leave: Command = {
    name: "leave",
    description: "Leaves the voice channel and stops playing",
    type: "CHAT_INPUT",
    public: true,

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild?.available) return;
        let voicechannel: VoiceBasedChannel | null | undefined = ctx.guild.me?.voice.channel
        if (!voicechannel) return reply(ctx,"Couldn't find voice channel!");
        let player: {player?: AudioPlayer,playing?: RealSong} = getPlayer(ctx.guild.id, false);
        if (player.player) {player.player.removeAllListeners();player.player.stop();}
        player.playing = undefined;
        let voiceconnection: VoiceConnection | undefined = getVoiceConnection(ctx.guild.id)
        if (voiceconnection?.disconnect()) return reply(ctx,"Left "+voicechannel?.toString());
        reply(ctx, "Failed to leave voice channel.");
    }
};