import { AudioPlayer, AudioPlayerStatus, AudioResource, createAudioPlayer, createAudioResource, getVoiceConnection, NoSubscriberBehavior, VoiceConnection } from "@discordjs/voice";
import { BaseCommandInteraction, Message, MessageOptions} from "discord.js";
import { Playlist } from "../../youtube/playlist";
import { MusicJSON, RealSong, Song } from "../../youtube/util";
import { client } from "../../index";
import { reply, TRUTHY } from "../util";
import { Command } from "./Commands";

export const Play: Command = {
    name: "play",
    description: "Begin playing music",
    type: "CHAT_INPUT",
    options: [{
        name: "silent",
        description: "Broadcast current song?",
        type: 5, // boolean
        required: false,
    }],

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;

        if (!ctx.guild.me?.voice) return reply(ctx,"Not in a voice channel!")
        let silent: boolean = false;
        if (ctx instanceof BaseCommandInteraction) {
            silent = !!ctx.options.get("silent",false)?.value
        } else if (ctx instanceof Message) {
            silent = TRUTHY.includes(ctx.content.replaceAll(/\s{2,}/g," ").split(" ")[2]?.toLowerCase())
        }
        let player: AudioPlayer = createAudioPlayer({behaviors: {noSubscriber: NoSubscriberBehavior.Pause}})
        let connection: VoiceConnection | undefined = getVoiceConnection(ctx.guild.id);
        if (!connection?.subscribe(player)) return reply(ctx,"Couldn't find voice connection!")

        let playlistdata: MusicJSON
        try {
            playlistdata = new Playlist(ctx.guild.id).playlistdata;
        } catch { return reply(ctx, "Couldn't find playlist!") }

        if (ctx instanceof BaseCommandInteraction) ctx.reply({content:"Began Playing!",ephemeral:!silent})
        player.stop()
        playSong(ctx,playlistdata,player,silent)
        player.on(AudioPlayerStatus.Idle, () => playSong(ctx,playlistdata,player,silent))
    }
}

function playSong(ctx: BaseCommandInteraction | Message, playlistdata: MusicJSON, player: AudioPlayer, silent: boolean) {
    let song: Song = playRandomSong(playlistdata, player)
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
}
function playRandomSong(playlist: MusicJSON, player: AudioPlayer): Song {
    let song: RealSong = playlist.items[Math.floor(Math.random()*playlist.items.length)]
    let audio: AudioResource = createAudioResource(song.file,{
        metadata: song,
        inlineVolume: false
    })
    player.play(audio);
    return song as Song;
}