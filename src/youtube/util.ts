import ytdl from "ytdl-core"
import ytpl from "ytpl"
export const AUDIOFORMAT = ".webm"

export function parseVideo(video: ytpl.Item, videoinfo?: ytdl.videoInfo): Song {
    let titlesegments = video.title.split(" - ").slice(0,2)
    let artistindex = titlesegments.findIndex(segment => segment.includes(video.author.name) || video.author.name.toLowerCase().includes(segment.replaceAll(/\s/g,"").toLowerCase()))
    return {
        id: video.id,

        title: artistindex >= 0 ? titlesegments[(artistindex+1)%2]?.replace(/[([].*?Official.*?[\])]/i,"")?.trim() : video.title,
        artist: titlesegments.length === 2 && artistindex >= 0 ? titlesegments[artistindex] : video.author.name,
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
export type SongReference = Song & {file: string, url: string}
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
    Korean = 'Korean'               ,// Way Back Home - SHAUN
    Japanese = 'Japanese'           ,// Into the Night - YOASABI
    Chinese = 'Chinese'             ,// 
    Eurobeat = 'Eurobeat'           ,// Running in the 90s
} // Philter, TheFatRat
export const genreIds: {[key in Genre as string]: number} = {
    "Unknown": 0,
    "Pop": 1,
    "Meme": 2,
    "Minecraft": 3,
    "Electronic": 4,
    "Instrumental": 5,
    "Korean": 6,
    "Japanese": 7,
    "Eurobeat": 8,
}