import { AudioPlayer, AudioResource, createAudioPlayer, createAudioResource, getVoiceConnection, NoSubscriberBehavior, StreamType, VoiceConnection } from "@discordjs/voice";
import { CommandInteraction, Message } from "discord.js";
import { error, ERRORS } from "../util";
import { Command } from "./Commands";

const player: AudioPlayer = createAudioPlayer({behaviors: {noSubscriber: NoSubscriberBehavior.Stop}})

export const Rickroll: Command = {
    name: "rr",
    description: "dQw4w9WgXcQ",
    defaultMemberPermissions: "Administrator",
    public: false,

    run: (ctx: CommandInteraction | Message) => {
        if (!ctx.guild || ctx instanceof Message) return;
        let conn: VoiceConnection | undefined = getVoiceConnection(ctx.guild.id)
        if (!conn) return error(ctx, ERRORS.NO_CONNECTION);

        try {
            conn.removeAllListeners();
            player.play(createAudioResource("./resources/rr.webm", {inlineVolume: false, inputType: StreamType.WebmOpus}));
            if (conn.subscribe(player)) return ctx.reply({content:"We participated in a miniscule amount of tomfoolery.",ephemeral: true});
        } catch (e) {console.warn(e)};
        ctx.reply({content: "Mission Failed, we'll get 'em next time.", ephemeral: true});
    }
}