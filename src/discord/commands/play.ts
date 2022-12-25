import { AudioPlayer, AudioPlayerError, AudioPlayerStatus, createAudioResource, getVoiceConnection, StreamType, VoiceConnection } from "@discordjs/voice"
import { ApplicationCommandOptionChoiceData, ApplicationCommandOptionType, AutocompleteInteraction, CommandInteraction } from "discord.js"
import { createReadStream } from "fs"
import { ERRORS, RatedSong, Song, SongReference } from "../../constants"
import nextSong from "../../recommendation/interface"
import { Playlist } from "../../web/playlist"
import { getPlayer, truncateString } from "../util"
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
    defaultMemberPermissions: "ManageChannels",
    public: true,

    run: (ctx: CommandInteraction, {id}: {id: string}) => {
        if (!ctx.guild) return Promise.reject(ERRORS.NO_GUILD);
        const guildid = ctx.guild.id;
        // Playlist Locating
        let pl = Playlist.getPlaylist(ctx.guild.id)
        if (!pl) return ctx.reply({content: ERRORS.NO_PLAYLIST, ephemeral: true});
        let playlist: RatedSong[] = pl.getSongs;
        if (!playlist) return ctx.reply({content: ERRORS.NO_SONG, ephemeral: true});
        // Argument Processing
        let rs: RatedSong | undefined = playlist.find(s=>s.id===id);
        let start: SongReferenceResolvable = (rs ? Playlist.getSong(rs) : null) || nextSong(ctx.guild.id);
        // Condition Validation
        let player: AudioPlayer = getPlayer(ctx.guild.id)
        player.removeAllListeners().stop()
        let connection: VoiceConnection | undefined = getVoiceConnection(ctx.guild.id);
        if (!connection?.subscribe(player)) return ctx.reply({content: ERRORS.NO_CONNECTION, ephemeral: true})
        // Action Execution
        history[guildid] ??= [];
        player.on(AudioPlayerStatus.Idle, () => {
            play(player, nextSong(guildid), guildid).then(()=>resetVotes(guildid));
        }).on("error", (e: AudioPlayerError) => {
            console.warn(`Audio Player Error: ${e.message}\n  Resource: [${e.resource.metadata ? JSON.stringify(e.resource.metadata) : JSON.stringify(e.resource)}]`);
        });
        return play(player, start, guildid).then(()=>{
            if (ctx instanceof CommandInteraction && !ctx.deferred && !ctx.replied) return ctx.reply({content:"Began Playing!",ephemeral:true});
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
                return {name: truncateString(s.artist+' - '+s.title, 25),value:s.id}
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