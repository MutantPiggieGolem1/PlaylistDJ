import { AudioPlayer, AudioPlayerStatus, createAudioResource, getVoiceConnection, StreamType, VoiceConnection } from "@discordjs/voice";
import { BaseCommandInteraction, Message, MessageEmbed, MessageOptions} from "discord.js";
import { getPlaylist } from "../../youtube/playlist";
import { MusicJSON, RealSong, Song } from "../../youtube/util";
import { client } from "../../index";
import { getPlayer, reply, TRUTHY } from "../util";
import { Command } from "./Commands";
import { resetVotes } from "./vote";
import { createReadStream } from "fs"

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

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;

        try {
            var playlist: MusicJSON = getPlaylist(ctx.guild.id).playlistdata;
        } catch { return reply(ctx, "Couldn't find playlist!") }
        if (!playlist.items) return reply(ctx, "Couldn't find songs!")

        let start: RealSong | undefined, silent: boolean;
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

        let player: {player:AudioPlayer,playing?:RealSong} = getPlayer(ctx.guild.id)
        player.player.removeAllListeners()
        player.player.stop()
        let connection: VoiceConnection | undefined = getVoiceConnection(ctx.guild.id);
        if (!connection?.subscribe(player.player)) return reply(ctx,"Couldn't find voice connection!")
        
        if (ctx instanceof BaseCommandInteraction) ctx.reply({content:"Began Playing!",ephemeral:true})
        let song: RealSong = start ?? playlist.items[Math.floor(Math.random()*playlist.items.length)]
        let msg: MessageOptions = play(player, song)
        if (ctx.channel && !silent) ctx.channel.send(msg);
        let gid: string = ctx.guild.id;
        player.player.on(AudioPlayerStatus.Idle, () => {
            let song: RealSong = playlist.items[Math.floor(Math.random()*playlist.items.length)]
            let msg: MessageOptions = play(player, song);
            if (ctx.channel && !silent) ctx.channel.send(msg);
            resetVotes(gid);
        })
    }
}

function play(player: {player:AudioPlayer,playing?:RealSong}, song: RealSong): MessageOptions {
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