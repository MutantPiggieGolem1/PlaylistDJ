import { AudioPlayer, AudioPlayerStatus, createAudioResource, getVoiceConnection, StreamType, VoiceConnection } from "@discordjs/voice"
import { ApplicationCommandOptionChoiceData, ApplicationCommandOptionType, AutocompleteInteraction, CommandInteraction, Message } from "discord.js"
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
    options: [{
        name: "id",
        description: "Song ID to start with",
        type: ApplicationCommandOptionType.String,
        required: false,
        autocomplete: true,
    },{
        name: "timeout",
        description: "Duration music should play for (minutes)",
        type: ApplicationCommandOptionType.Number,
        required: false
    }],
    defaultMemberPermissions: "Speak",
    public: true,

    run: async (ctx: CommandInteraction | Message) => {
        if (!ctx.guild) return;
        // Playlist Locating
        let pl = getPlaylist(ctx.guild.id)
        if (!pl) return error(ctx,ERRORS.NO_PLAYLIST);
        let playlist: MusicJSON = pl.playlistdata;
        if (!playlist.items) return error(ctx,ERRORS.NO_SONG);
        // Argument Processing
        let arg1: string | undefined, arg2: string | undefined;
        if (ctx instanceof CommandInteraction) {
            arg1 = ctx.options.get("id",false)?.value?.toString()
            arg2 = ctx.options.get("timeout",false)?.value?.toString()
        } else {
            [arg1,arg2] = ctx.content.split(/\s+/g).slice(2)
        }
        const start: SongReference = playlist.items.find(s=>s.id===arg1) ?? await nextSong(ctx.guild.id);
        const timeout: number = (arg2 && !Number.isNaN(arg2)) ? Date.now() + Number.parseInt(arg2)*60*1000 : timeouts[ctx.guild.id];
        // Condition Validation
        let player: AudioPlayer = getPlayer(ctx.guild.id)
        player.removeAllListeners().stop()
        let connection: VoiceConnection | undefined = getVoiceConnection(ctx.guild.id);
        if (!connection?.subscribe(player)) return error(ctx,ERRORS.NO_CONNECTION)
        // Action Execution
        const guildid = ctx.guild.id;
        timeouts[guildid] = timeout;
        if (ctx instanceof CommandInteraction) ctx.reply({content:"Began Playing!",ephemeral:true})
        play(player, start)

        player.on(AudioPlayerStatus.Idle, async () => {
            if (Date.now() >= timeouts[guildid]) {
                player.play(createAudioResource(createReadStream("./resources/end.webm"),{inlineVolume: false, inputType: StreamType.WebmOpus}))
                player.removeAllListeners().on(AudioPlayerStatus.Idle, () => {
                    leave(ctx);
                })
                return;
            }
            try {
                play(player, await nextSong(guildid));
                resetVotes(guildid);
            } catch (e) {
                console.error(e);
                return leave(ctx)
            }
        })
    },
    
    ac(ctx: AutocompleteInteraction): ApplicationCommandOptionChoiceData[] | Error {
        if (!ctx.guild) return new Error(ERRORS.NO_GUILD);
        const playlist = getPlaylist(ctx.guild.id);
        if (!playlist?.playlistdata.items || playlist.playlistdata.items.length <= 0) return new Error(ERRORS.NO_PLAYLIST);
        const focused = ctx.options.getFocused().toString();
        if (focused.length <= 0) return []; // too many matches, don't bother
        return Object.values(playlist.playlistdata.items)
            .filter(k=>k.id.startsWith(focused) || k.title.toLowerCase().startsWith(focused.toLowerCase()))
            .map(o=>{
                return {name:o.title,value:o.id} as ApplicationCommandOptionChoiceData
            })
    }
}

function play(player: AudioPlayer, song: SongReference) {
    player.play(createAudioResource<Song>(createReadStream(song.file),{inlineVolume: false, inputType: StreamType.WebmOpus, metadata: song as Song}))
}