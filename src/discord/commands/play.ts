import { AudioPlayer, AudioPlayerStatus, createAudioResource, getVoiceConnection, StreamType, VoiceConnection } from "@discordjs/voice"
import { ApplicationCommandOptionChoiceData, AutocompleteInteraction, BaseCommandInteraction, Message } from "discord.js"
import { createReadStream } from "fs"
import nextSong from "../../recommendation/interface"
import { getPlaylist } from "../../youtube/playlist"
import { MusicJSON, Song, SongReference } from "../../youtube/util"
import { error, ERRORS, getPlayer } from "../util"
import { Command } from "./Commands"
import { leave } from "./leave"
import { resetVotes } from "./vote"

export const timeouts: {[key:string]: number} = {}

export const Play: Command = {
    name: "play",
    description: "Begins playing music.",
    type: "CHAT_INPUT",
    options: [{
        name: "id",
        description: "Song ID to start with",
        type: "STRING",
        required: false,
        autocomplete: true,
    },{
        name: "timeout",
        description: "Duration music should play for (minutes)",
        type: "NUMBER",
        required: false
    }],
    public: true,

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        // Playlist Locating
        let pl = getPlaylist(ctx.guild.id)
        if (!pl) return error(ctx,ERRORS.NO_PLAYLIST);
        let playlist: MusicJSON = pl.playlistdata;
        if (!playlist.items) return error(ctx,ERRORS.NO_SONG);
        // Argument Processing
        let arg1: string | undefined, arg2: string | undefined;
        if (ctx instanceof BaseCommandInteraction) {
            arg1 = ctx.options.get("id",false)?.value?.toString()
            arg2 = ctx.options.get("timeout",false)?.value?.toString()
        } else {
            [arg1,arg2] = ctx.content.split(/\s+/g).slice(2)
        }
        const start: SongReference = playlist.items.find(s=>s.id===arg1) ?? await nextSong(ctx.guild.id);
        const timeout: number = (arg2 && !Number.isNaN(arg2)) ? Date.now() + Number.parseInt(arg2)*60*1000 : (timeouts[ctx.guild.id] || -1);
        // Condition Validation
        let player: AudioPlayer = getPlayer(ctx.guild.id)
        player.removeAllListeners().stop()
        let connection: VoiceConnection | undefined = getVoiceConnection(ctx.guild.id);
        if (!connection?.subscribe(player)) return error(ctx,ERRORS.NO_CONNECTION)
        // Action Execution
        const guildid = ctx.guild.id;
        if (timeout > 0) timeouts[guildid] = timeout;
        if (ctx instanceof BaseCommandInteraction) ctx.reply({content:"Began Playing!",ephemeral:true})
        play(player, start)

        player.on(AudioPlayerStatus.Idle, async () => {
            if (timeouts[guildid] && Date.now() >= timeouts[guildid]) {
                ctx.channel?.send("Finished Playing!")
                player.play(createAudioResource(createReadStream("./resources/end.webm"),{inlineVolume: false, inputType: StreamType.WebmOpus}))
                player.removeAllListeners().on(AudioPlayerStatus.Idle, () => {
                    leave(ctx);
                })
            }
            try {
                play(player, await nextSong(guildid));
                resetVotes(guildid);
            } catch (e) {
                if (ctx.channel) {error(ctx.channel, e as Error)} else {console.error(e)}
                return leave(ctx)
            }
        })
    },
    
    ac(ctx: AutocompleteInteraction): ApplicationCommandOptionChoiceData[] | Error {
        if (!ctx.guild) return new Error(ERRORS.NO_GUILD);
        const playlist = getPlaylist(ctx.guild.id);
        if (!playlist?.playlistdata.items || playlist.playlistdata.items.length <= 0) return new Error(ERRORS.NO_PLAYLIST);
        const focused = ctx.options.getFocused()
        if (focused.length <= 0) return []; // too many matches, don't bother
        return Object.values(playlist.playlistdata.items)
            .filter(k=>k.id.startsWith(focused) || k.title.toLowerCase().startsWith(focused.toLowerCase()))
            .map(o=>{
                return {name:o.title,value:o.id} as ApplicationCommandOptionChoiceData
            })
    }
}

function play(player: AudioPlayer, song: SongReference) {
    player.play(createAudioResource(createReadStream(song.file),{inlineVolume: false, inputType: StreamType.WebmOpus, metadata: song as Song}))
}