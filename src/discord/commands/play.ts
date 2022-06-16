import { AudioPlayer, AudioPlayerStatus, AudioResource, createAudioPlayer, createAudioResource, getVoiceConnection, NoSubscriberBehavior, VoiceConnection } from "@discordjs/voice";
import { BaseCommandInteraction, Message, MessageOptions} from "discord.js";
import { Playlist } from "../../youtube/playlist";
import { MusicJSON, RealSong, Song } from "../../youtube/util";
import { client } from "../../index";
import { reply } from "../util";
import { Command } from "./Commands";

export const Play: Command = {
    name: "play",
    description: "Begin playing music",
    type: "CHAT_INPUT",

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        if (!ctx.guild.me?.voice) return reply(ctx,"Not in a voice channel!")
        let player: AudioPlayer = createAudioPlayer({behaviors: {noSubscriber: NoSubscriberBehavior.Pause}})
        let connection: VoiceConnection | undefined = getVoiceConnection(ctx.guild.id);
        if (!connection?.subscribe(player)) return reply(ctx,"Couldn't find voice connection!")

        let playlistdata: MusicJSON
        try {
            playlistdata = new Playlist(ctx.guild.id).playlistdata;
        } catch { return reply(ctx, "Couldn't find playlist!") }

        if (ctx instanceof BaseCommandInteraction) ctx.reply({content:"Began Playing!",ephemeral:true})
        player.stop()
        playSong(ctx,playlistdata,player)
        player.on(AudioPlayerStatus.Idle, () => playSong(ctx,playlistdata,player))
    }
}

function playSong(ctx: BaseCommandInteraction | Message, playlistdata: MusicJSON, player: AudioPlayer) {
    let song: Song = playRandomSong(playlistdata, player)
    if (ctx.channel) ctx.channel.send({embeds:[{
        type: "rich",
        title: "Now Playing:",
        description: `${song.title} - ${song.artist}`,
        color: 0xff0000,
        "footer": {
            text: `PlaylistDJ - Playing Music`,
            icon_url: client.user?.avatarURL() ?? ""
        }
    }]} as MessageOptions)
}
function playRandomSong(playlist: MusicJSON, player: AudioPlayer): Song {
    let song: RealSong = playlist.songs[Math.floor(Math.random()*playlist.songs.length)]
    let audio: AudioResource = createAudioResource(song.file,{
        metadata: song,
        inlineVolume: false
    })
    player.play(audio);
    return song as Song;
}