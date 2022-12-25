import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, getVoiceConnection, NoSubscriberBehavior, StreamType, VoiceConnection } from "@discordjs/voice"
import { CommandInteraction, VoiceBasedChannel } from "discord.js"
import { ERRORS } from "../../constants"
import { Command } from "./Commands"
import { join } from "./join"
import { leave } from "./leave"

const player: AudioPlayer = createAudioPlayer({behaviors: {noSubscriber: NoSubscriberBehavior.Stop}})

export const Rickroll: Command = {
    name: "rr",
    description: "dQw4w9WgXcQ",
    defaultMemberPermissions: "Administrator",
    public: false,

    run: (ctx: CommandInteraction) => {
        if (!ctx.guild) return Promise.reject(ERRORS.NO_GUILD);
        let conn: VoiceConnection | undefined = getVoiceConnection(ctx.guild.id)
        if (!conn) {
            const channel = ctx.guild.channels.cache.filter((c): c is VoiceBasedChannel => c.isVoiceBased()).sort((a,b)=>b.members.size-a.members.size).at(0);
            if (!channel) return ctx.reply({content:"No Channel Found, we'll get 'em next time.",ephemeral:true});
            conn = join(channel);
        } else {
            conn.removeAllListeners();
        }
        try {
            player.play(createAudioResource("./resources/rr.webm", {inlineVolume: false, inputType: StreamType.WebmOpus}));
            if (conn.subscribe(player)) return ctx.reply({content:"We participated in a miniscule amount of tomfoolery.",ephemeral:true});
        } catch (e) {console.warn(e)}
        return ctx.reply({content: "Mission Failed, we'll get 'em next time.",ephemeral:true});
    }
}