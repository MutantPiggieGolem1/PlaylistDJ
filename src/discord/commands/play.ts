import { AudioPlayer, AudioPlayerStatus, createAudioResource, getVoiceConnection, StreamType, VoiceConnection } from "@discordjs/voice";
import { BaseCommandInteraction, Message, MessageEmbed, MessageOptions } from "discord.js";
import { createReadStream, existsSync } from "fs";
import { client } from "../../index";
import { getPlaylist } from "../../youtube/playlist";
import { MusicJSON, RatedSong, Song } from "../../youtube/util";
import { getPlayer, reply, TRUTHY } from "../util";
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
        type: 5, // boolean
        required: false,
    }],

    run: (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;

        let pl = getPlaylist(ctx.guild.id)
        if (!pl) return reply(ctx, "Couldn't find playlist!")
        let playlist: MusicJSON = pl.playlistdata;
        if (!playlist.items) return reply(ctx, "Couldn't find songs!")

        let start: RatedSong | undefined, silent: boolean;
        if (ctx instanceof BaseCommandInteraction) {
            let ss: string | undefined = ctx.options.get("song",false)?.value?.toString()
            if (ss) start = playlist.items.find(s=>s.id===ss)
            silent = !!ctx.options.get("silent",false)?.value
        } else {
            let si: string | undefined, ss: string | undefined;
            [ss,si] = ctx.content.split(/\s+/g).slice(2)
            if (ss) start = playlist.items.find(s=>s.id===ss)
            silent = TRUTHY.includes(si?.toLowerCase())
        }

        let player: {player:AudioPlayer,playing?:RatedSong} = getPlayer(ctx.guild.id)
        player.player.removeAllListeners()
        player.player.stop()
        let connection: VoiceConnection | undefined = getVoiceConnection(ctx.guild.id);
        if (!connection?.subscribe(player.player)) return reply(ctx,"Couldn't find voice connection!")
        
        if (ctx instanceof BaseCommandInteraction) ctx.reply({content:"Began Playing!",ephemeral:true})
        let song: RatedSong = start ?? playlist.items[Math.floor(Math.random()*playlist.items.length)]
        let msg: MessageOptions = play(player, song)
        if (ctx.channel && !silent) ctx.channel.send(msg);
        player.player.on(AudioPlayerStatus.Idle, () => {
            let song: RatedSong = playlist.items[Math.floor(Math.random()*playlist.items.length)]
            let msg: MessageOptions = play(player, song);
            if (ctx.channel && !silent) ctx.channel.send(msg);
            if (ctx.guild?.id) resetVotes(ctx.guild.id);
        })
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