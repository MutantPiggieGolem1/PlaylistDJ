import { AudioPlayer, AudioPlayerStatus, createAudioResource, getVoiceConnection, StreamType, VoiceConnection } from "@discordjs/voice";
import { BaseCommandInteraction, Message, MessageEmbed, MessageOptions } from "discord.js";
import { createReadStream, existsSync } from "fs";
import { client } from "../../index";
import { getPlaylist } from "../../youtube/playlist";
import { MusicJSON, RatedSong, Song } from "../../youtube/util";
import { error, ERRORS, getPlayer, TRUTHY } from "../util";
import { Command } from "./Commands";
import { resetVotes } from "./vote";

export const Play: Command = {
    name: "play",
    description: "Begins playing music.",
    type: "CHAT_INPUT",
    public: true,
    options: [{
        name: "song",
        description: "Song ID to start with",
        type: "STRING",
        required: false,
    },{
        name: "silent",
        description: "Broadcast current song?",
        type: "BOOLEAN",
        required: false,
    },{
        name: "timeout",
        description: "Duration music should play for (minutes)",
        type: "NUMBER",
        required: false
    }],

    run: (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        // Playlist Locating
        let pl = getPlaylist(ctx.guild.id)
        if (!pl) return error(ctx,ERRORS.NO_PLAYLIST);
        let playlist: MusicJSON = pl.playlistdata;
        if (!playlist.items) return error(ctx,ERRORS.NO_SONG);
        // Argument Processing
        let arg1: string | undefined, arg2: boolean, arg3: string | undefined;
        if (ctx instanceof BaseCommandInteraction) {
            arg1 = ctx.options.get("song",false)?.value?.toString()
            arg2 = !!ctx.options.get("silent",false)?.value
            arg3 = ctx.options.get("timeout",false)?.value?.toString()
        } else {
            let a2: string | undefined;
            [arg1,a2,arg3] = ctx.content.split(/\s+/g).slice(2)
            arg2 = TRUTHY.includes(a2?.toLowerCase())
        }
        let start: RatedSong, silent: boolean, timeout: number;
        start = playlist.items.find(s=>s.id===arg1) ?? playlist.items[Math.floor(Math.random()*playlist.items.length)]
        silent = arg2;
        timeout = (arg3 && !Number.isNaN(arg3)) ? Number.parseInt(arg3)*60*1000 : -1;
        // Condition Validation
        let player: {player:AudioPlayer,playing?:RatedSong} = getPlayer(ctx.guild.id)
        player.player.removeAllListeners()
        player.player.stop()
        let connection: VoiceConnection | undefined = getVoiceConnection(ctx.guild.id);
        if (!connection?.subscribe(player.player)) return error(ctx,ERRORS.NO_CONNECTION)
        // Action Execution
        if (ctx instanceof BaseCommandInteraction) ctx.reply({content:"Began Playing!",ephemeral:true})
        let msg: MessageOptions = play(player, start)
        if (ctx.channel && !silent) ctx.channel.send(msg);
        player.player.on(AudioPlayerStatus.Idle, () => {
            let song: RatedSong = playlist.items[Math.floor(Math.random()*playlist.items.length)]
            let msg: MessageOptions = play(player, song);
            if (ctx.channel && !silent) ctx.channel.send(msg);
            if (ctx.guild?.id) resetVotes(ctx.guild.id);
        })
        if (timeout > 0) setTimeout(() => {
            player.player?.removeAllListeners()
            player.player?.stop()
            player.playing = undefined;
            ctx.channel?.send("Finished Playing!")
        }, timeout);
    }
}

function play(player: {player:AudioPlayer,playing?:RatedSong}, song: RatedSong): MessageOptions {
    if (!existsSync(song.file)) {
        player.player.removeAllListeners()
        player.playing = undefined;
        return {content:"Couldn't locate resources!"}
    }
    player.player.play(createAudioResource(createReadStream(song.file),{
        inputType: StreamType.WebmOpus,
        metadata: song as Song,
        inlineVolume: false,
    }))
    player.playing = song;
    return {embeds:[{
        type: "rich",
        title: "Now Playing:",
        description: `${song.title} - ${song.artist}\n\`${song.id}\``,
        color: 0xff0000,
        footer: {
            text: `PlaylistDJ - Playing Music`,
            icon_url: client.user?.avatarURL() ?? ""
        }
    } as Partial<MessageEmbed>]} as MessageOptions
}