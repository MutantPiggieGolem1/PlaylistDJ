import { AudioPlayer, AudioPlayerError, AudioPlayerStatus, createAudioResource, getVoiceConnection, StreamType, VoiceConnection } from "@discordjs/voice"
import { ApplicationCommandOptionChoiceData, ApplicationCommandOptionType, AutocompleteInteraction, CommandInteraction, Message } from "discord.js"
import { createReadStream } from "fs"
import { ERRORS, RatedSong, Song, SongReference } from "../../constants"
import nextSong from "../../recommendation/interface"
import { Playlist } from "../../web/playlist"
import { error, getPlayer } from "../util"
import { Command } from "./Commands"
import { leave } from "./leave"
import { resetVotes } from "./vote"

export const history:  {[key:string]: Array<String>} = {}

export const Play: Command = {
    name: "play",
    description: "Begins playing music.",
    options: [{
        name: "id",
        description: "Song ID to start with",
        type: ApplicationCommandOptionType.String,
        required: false,
        autocomplete: true,
    }],
    defaultMemberPermissions: "Speak",
    public: true,

    run: (ctx: CommandInteraction | Message) => {
        if (!ctx.guild) return Promise.reject(ERRORS.NO_GUILD);
        const guildid = ctx.guild.id;
        // Playlist Locating
        let pl = Playlist.getPlaylist(ctx.guild.id)
        if (!pl) return error(ctx, ERRORS.NO_PLAYLIST);
        let playlist: RatedSong[] = pl.getSongs;
        if (!playlist) return error(ctx, ERRORS.NO_SONG);
        // Argument Processing
        let arg1: string | undefined = ctx instanceof CommandInteraction ?
            ctx.options.get("id",false)?.value?.toString() :
            ctx.content.split(/\s+/g)[2];
        let rs: RatedSong | undefined = playlist.find(s=>s.id===arg1);
        let start: SongReferenceResolvable = (rs ? Playlist.getSong(rs) : null) || nextSong(ctx.guild.id);
        // Condition Validation
        let player: AudioPlayer = getPlayer(ctx.guild.id)
        player.removeAllListeners().stop()
        let connection: VoiceConnection | undefined = getVoiceConnection(ctx.guild.id);
        if (!connection?.subscribe(player)) return error(ctx, ERRORS.NO_CONNECTION)
        // Action Execution
        history[guildid] = [];
        player.on(AudioPlayerStatus.Idle, () => {
            play(player, nextSong(guildid), guildid).then(()=>resetVotes(guildid));
        }).on("error", (e: AudioPlayerError) => {
            console.warn(`Audio Player Error: ${e.message}\n  Resource: [${e.resource.metadata ? JSON.stringify(e.resource.metadata) : JSON.stringify(e.resource)}]`);
        });
        return play(player, start, guildid).then(()=>{
            if (ctx instanceof CommandInteraction && !ctx.deferred && !ctx.replied) return ctx.reply({content:"Began Playing!",ephemeral:true}).then(()=>{})
        });
    },
    
    ac(ctx: AutocompleteInteraction) {
        if (!ctx.guild) return null;
        const playlist = Playlist.getPlaylist(ctx.guild.id);
        if (!playlist?.getSongs || playlist.getSongs.length <= 0) return null;
        const focused = ctx.options.getFocused().toString();
        if (focused.length <= 0 && playlist.getSongs.length > 25) return []; // too many matches, don't bother
        return playlist.getSongs
            .map(Playlist.getSong)
            .filter((sr: SongReference | null): sr is SongReference => !!sr)
            .filter((sr: SongReference)=>sr.id.startsWith(focused) || sr.title.toLowerCase().startsWith(focused.toLowerCase()))
            .map((s: Song) => {
                return {name:s.title,value:s.id} as ApplicationCommandOptionChoiceData
            })
    }
}

type SongReferenceResolvable = SongReference | null | Promise<SongReference | null>;
async function play(player: AudioPlayer, song: SongReferenceResolvable, guildid: string) {
    if (song instanceof Promise) song = await song;
    if (!song) return leave(guildid);
    if (guildid && history[guildid] !== undefined) history[guildid].unshift(song.id);
    player.play(createAudioResource<Song>(createReadStream(song.file),{inlineVolume: false, inputType: StreamType.WebmOpus, metadata: song as Song}))
}