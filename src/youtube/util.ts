import ytpl from "ytpl";
import ytdl from "ytdl-core";
export const AUDIOFORMAT = ".webm"

export function parseVideo(video: ytpl.Item, videoinfo?: ytdl.videoInfo): Song {
    let titlesegments = video.title.split(" - ").slice(0,2)
    let artistindex = titlesegments.findIndex(segment => segment.includes(video.author.name) || video.author.name.toLowerCase().includes(segment.replaceAll(/\s/g,"").toLowerCase()))
    return {
        id: video.id,

        title: titlesegments[artistindex >= 0 ? (artistindex+1)%2 : 1]?.replace(/[([].*?Official.*?[\])]/i,"")?.trim() ?? video.title ?? "Unknown",
        artist: titlesegments.length === 2 && artistindex >= 0 ? titlesegments[artistindex] : "Unknown Artist",
        genre: Genre.Unknown,
        length: video.durationSec ?? -1,
    }
}

export type MusicJSON = {
    guildid: string,
    url?: string[],

    items: Array<RatedSong>,
}

export type RatedSong = SongReference & {tags?: Array<string>, score: number}
export type SongReference = Song & {file: string,url: string}
export type Song = { // objective properties
    id: string,

    title: string,
    artist: string,
    genre: Genre,
    length: number, // Song Duration (Seconds)
}

export enum Genre {
    Unknown = 'Unknown'             ,
    Pop = 'Pop'                     ,// Shake it Off - Taylor Swift
    Meme = 'Meme'                   ,// Plastic Bag - Paty Kerry
    Minecraft = 'Minecraft'         ,// Dragonhearted - TryHardNinja
    Electronic = 'Electronic'       ,// Base After Base - DJVI
    Instrumental = 'Instrumental'   ,// 
    Japanese = 'Japanese'           ,// YOASABI - Into the Night
    Chinese = 'Chinese'             ,// 
    Eurobeat = 'Eurobeat'           ,// Running in the 90s
} // Philter, TheFatRat