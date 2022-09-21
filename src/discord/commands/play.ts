import { AudioPlayer, AudioPlayerError, AudioPlayerStatus, AudioResource, createAudioResource, demuxProbe, getVoiceConnection, ProbeInfo, StreamType, VoiceConnection } from "@discordjs/voice"
import { ApplicationCommandOptionChoiceData, ApplicationCommandOptionType, AutocompleteInteraction, CommandInteraction, Message } from "discord.js"
import { createReadStream } from "fs"
import nextSong from "../../recommendation/interface"
import { MusicJSON, Song, SongReference } from "../../youtube/util"
import { error, ERRORS, getPlayer } from "../util"
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

    run: async (ctx: CommandInteraction | Message) => {
        if (!ctx.guild) return;
        const guildid = ctx.guild.id;
        // Playlist Locating
        let pl = getPlaylist(ctx.guild.id)
        if (!pl) return error(ctx,ERRORS.NO_PLAYLIST);
        let playlist: MusicJSON = pl.playlistdata;
        if (!playlist.items) return error(ctx,ERRORS.NO_SONG);
        // Argument Processing
        let arg1: string | undefined = ctx instanceof CommandInteraction ?
            ctx.options.get("id",false)?.value?.toString() :
            ctx.content.split(/\s+/g)[2];
        let start: SongReference | undefined = playlist.items.find(s=>s.id===arg1);
        if (!start) {
            if (arg1) await error(ctx, ERRORS.NO_SONG);
            start = await nextSong(ctx.guild.id);
        }
        // Condition Validation
        let player: AudioPlayer = getPlayer(ctx.guild.id)
        player.removeAllListeners().stop()
        let connection: VoiceConnection | undefined = getVoiceConnection(ctx.guild.id);
        if (!connection?.subscribe(player)) return error(ctx, ERRORS.NO_CONNECTION)
        // Action Execution
        if (ctx instanceof CommandInteraction && !ctx.deferred && !ctx.replied) ctx.reply({content:"Began Playing!",ephemeral:true})
        play(player, start)
        history[guildid] = [start.id];

        player.on(AudioPlayerStatus.Idle, async () => {
            play(player, await nextSong(guildid), guildid);
            resetVotes(guildid);
        }).on("error", (e: AudioPlayerError) => {
            console.error(`Audio Player Error: ${e.message}\n  Resource: [${e.resource.metadata ? JSON.stringify(e.resource.metadata) : JSON.stringify(e.resource)}]`);
        });
    },
    
    ac(ctx: AutocompleteInteraction): ApplicationCommandOptionChoiceData[] | Error {
        if (!ctx.guild) return new Error(ERRORS.NO_GUILD);
        const playlist = getPlaylist(ctx.guild.id);
        if (!playlist?.playlistdata.items || playlist.playlistdata.items.length <= 0) return new Error(ERRORS.NO_PLAYLIST);
        const focused = ctx.options.getFocused().toString();
        if (focused.length <= 0) return []; // too many matches, don't bother
        return Object.values(playlist.playlistdata.items)
            .filter(k=>k.id.startsWith(focused) || k.title.toLowerCase().startsWith(focused.toLowerCase()))
            .map(o => {
                return {name:o.title,value:o.id} as ApplicationCommandOptionChoiceData
            })
    }
}

function play(player: AudioPlayer, song: SongReference, guildid?: string) {
    // TODO: check if song is playable
    if (guildid && history[guildid]) history[guildid].unshift(song.id);
    player.play(createAudioResource<Song>(createReadStream(song.file),{inlineVolume: false, inputType: StreamType.WebmOpus, metadata: song as Song}))
}