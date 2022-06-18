import ytpl from "ytpl";
import ytdl from "ytdl-core";
export const AUDIOFORMAT = ".webm"

export function parseVideo(video: ytpl.Item, videoinfo: ytdl.videoInfo): Song {
    let titlesegments = video.title.split(" - ").slice(0,2)
    let artistindex = titlesegments.findIndex(segment => segment.includes(video.author.name) || video.author.name.toLowerCase().includes(segment.replaceAll(/\s/g,"").toLowerCase()))
    return {
        id: video.id,

        title: titlesegments[artistindex >= 0 ? (artistindex+1)%2 : 1]?.replace(/[([].*?Official.*?[\])]/i,"")?.trim() ?? video.title ?? "Unknown",
        artist: titlesegments.length === 2 && artistindex >= 0 ? titlesegments[artistindex] : "Unknown Artist",
        genre: Genre.Unknown,
        length: video.durationSec ?? -1,

        score: 0,
    } // TODO: Parse video information
}

export function isMusicJSON(arg: any): arg is MusicJSON { // good enough
    return  typeof arg?.directory === "string" &&
            arg.url?.every && arg.url.every((u: any)=>typeof u === "string") &&
            typeof arg.items === "object"
}


export type MusicJSON = {
    directory: string,
    url: string[],

    items: Array<RealSong>,
}

export type RealSong = Song & {file: string, url: string}

export type Song = {
    id: string,

    title: string,
    artist: string,
    genre: Genre,
    length: number, // Song Duration (Seconds)

    tags?: Array<string>,
    score: number,
}

export enum Genre {
    Unknown   ,
    Pop       ,// Shake it Off - Taylor Swift
    Meme      ,// Plastic Bag - Paty Kerry
    Minecraft ,// Dragonhearted- TryHardNinja
    EDM       ,// Base After Base - DJVI
    House     ,// 
    Instrumental,// 
    Japanese  ,// Nausicaa on the Valley of the Wind - Joe Hisaishi
    Eurobeat  ,// Running in the 90s
} // Philter, TheFatRat