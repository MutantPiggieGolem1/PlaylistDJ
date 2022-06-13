import { AudioPlayer, AudioResource, createAudioPlayer, createAudioResource, getVoiceConnection, NoSubscriberBehavior, VoiceConnection } from "@discordjs/voice";
import { BaseCommandInteraction, Message } from "discord.js";
import { reply } from "../util";
import { Command } from "./Command";

const player: AudioPlayer = createAudioPlayer({behaviors: {noSubscriber: NoSubscriberBehavior.Pause}})

export const Rickroll: Command = {
    name: "rr",
    description: "dQw4w9WgXcQ",
    type: "CHAT_INPUT",

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        let conn: VoiceConnection | undefined = getVoiceConnection(ctx.guild.id)
        if (!conn) {await reply(ctx,"Couldn't find voice connection!",true); return;}

        player.play(createAudioResource("./resources/rr.mp3", {
            metadata: {
                title: "Never Gonna Give You Up",
                artist: "Rick Astley",
                ytid: "dQw4w9WgXcQ"
            }
        }))
        if (conn.subscribe(player)) {
            reply(ctx,"We participated in a miniscule amount of tomfoolery.",true);
        } else {
            reply(ctx,"Mission Failed, We'll get em next time.",true);
        }
        if (ctx instanceof Message && ctx.deletable) ctx.delete();
    }
}