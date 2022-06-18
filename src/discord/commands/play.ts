import { AudioPlayer, AudioPlayerStatus, AudioResource, createAudioResource, getVoiceConnection, VoiceConnection } from "@discordjs/voice";
import { BaseCommandInteraction, Message, MessageOptions} from "discord.js";
import { Playlist } from "../../youtube/playlist";
import { MusicJSON, RealSong, Song } from "../../youtube/util";
import { client } from "../../index";
import { getPlayer, reply, TRUTHY } from "../util";
import { Command } from "./Commands";

export const Play: Command = {
    name: "play",
    description: "Begin playing music",
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
            var playlist: MusicJSON = new Playlist(`./resources/music/${ctx.guild.id}/`).playlistdata;
        } catch { return reply(ctx, "Couldn't find playlist!") }

        let start: RealSong | undefined, silent: boolean;
        if (ctx instanceof BaseCommandInteraction) {
            let ss: string | undefined = ctx.options.get("song",false)?.value?.toString()
            if (ss) start = playlist.items.find(s=>s.id===ss||s.title.toLowerCase()===ss?.toLowerCase())
            silent = !!ctx.options.get("silent",false)?.value
        } else {
            let si: string | undefined, ss: string | undefined;
            [ss,si] = ctx.content.replaceAll(/\s{2,}/g," ").split(" ").slice(2)
            if (ss) start = playlist.items.find(s=>s.id===ss||s.title.toLowerCase()===ss?.toLowerCase())
            silent = TRUTHY.includes(si?.toLowerCase())
        }

        let player: AudioPlayer = getPlayer(ctx.guild.id)
        let connection: VoiceConnection | undefined = getVoiceConnection(ctx.guild.id);
        if (!connection?.subscribe(player)) return reply(ctx,"Couldn't find voice connection!")
        player.removeAllListeners()
        player.stop()

        let song: RealSong = start ?? playlist.items[Math.floor(Math.random()*playlist.items.length)]
        player.play(createAudioResource(song.file,{
            metadata: song as Song,
            inlineVolume: false,
        }))
        if (ctx instanceof BaseCommandInteraction) ctx.reply({content:"Began Playing!",ephemeral:!silent})
        player.on(AudioPlayerStatus.Idle, () => {
            let song: RealSong = playlist.items[Math.floor(Math.random()*playlist.items.length)]
            player.play(createAudioResource(song.file,{
                metadata: song as Song,
                inlineVolume: false,
            }))
            if (ctx.channel && !silent) ctx.channel.send({embeds:[{
                type: "rich",
                title: "Now Playing:",
                description: `${song.title} - ${song.artist}`,
                color: 0xff0000,
                "footer": {
                    text: `PlaylistDJ - Playing Music`,
                    icon_url: client.user?.avatarURL() ?? ""
                }
            }]} as MessageOptions)
        })
    }
}