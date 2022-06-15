import { AudioPlayer, AudioPlayerStatus, AudioResource, createAudioPlayer, createAudioResource, getVoiceConnection, NoSubscriberBehavior, VoiceConnection } from "@discordjs/voice";
import { BaseCommandInteraction, Message, MessageComponentInteraction, MessageOptions} from "discord.js";
import { client } from "../index";
import { getPlaylistFiles, MusicJSON, reply, Song, SongFile } from "../util";
import { Command } from "./Commands";

export const Play: Command = { // TODO: Reccomendation Engine
    name: "play",
    description: "Begin playing music",
    type: "CHAT_INPUT",

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        let player: AudioPlayer = createAudioPlayer({behaviors: {noSubscriber: NoSubscriberBehavior.Pause}})
        let connection: VoiceConnection | undefined = getVoiceConnection(ctx.guild.id);
        if (!connection?.subscribe(player)) return reply(ctx,"Couldn't find voice connection!")

        let playlistdata: MusicJSON;
        let files: string[];
        try {
            [playlistdata, files] = getPlaylistFiles(ctx.guild.id);
        } catch (e) {return console.error(e)}

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
        player.on(AudioPlayerStatus.Idle, () => {
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
        })
    }
}

function playRandomSong(playlist: MusicJSON, player: AudioPlayer): Song {
    let song: SongFile = Object.values(playlist)[Math.round(Math.random()*Object.values(playlist).length)]
    let audio: AudioResource = createAudioResource(song.file,{
        metadata: {
            title: song.title,
            artist: song.artist,
            ytid: song.id
        }
    })
    player.play(audio);
    return song as Song;
}