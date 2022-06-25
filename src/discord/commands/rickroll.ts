import { AudioPlayer, AudioResource, createAudioPlayer, createAudioResource, getVoiceConnection, NoSubscriberBehavior, VoiceConnection } from "@discordjs/voice";
import { BaseCommandInteraction, Message } from "discord.js";
import { error, ERRORS } from "../util";
import { Command } from "./Commands";

const player: AudioPlayer = createAudioPlayer({behaviors: {noSubscriber: NoSubscriberBehavior.Pause}})

export const Rickroll: Command = {
    name: "rr",
    description: "dQw4w9WgXcQ",
    type: "CHAT_INPUT",
    public: false,

    run: (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        let conn: VoiceConnection | undefined = getVoiceConnection(ctx.guild.id)
        if (!conn) return error(ctx, ERRORS.NO_CONNECTION);

        if (ctx instanceof Message && ctx.deletable) ctx.delete();
        let rr: AudioResource = createAudioResource("./resources/rr.webm", {inlineVolume: true})
        rr.volume?.setVolumeDecibels(69)
        player.play(rr)
        conn.removeAllListeners();
        if (!conn.subscribe(player)) return;
        if (ctx instanceof BaseCommandInteraction) {
            ctx.reply({content:"We participated in a miniscule amount of tomfoolery.",ephemeral:true});
        } else {
            ctx.author.send("We participated in a miniscule amount of tomfoolery.")
        }
    }
}