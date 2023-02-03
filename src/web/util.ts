import { Playlist } from "./playlist"
import ytdl from "ytdl-core"
import ytpl from "ytpl"
import { Song, Genre, RatedSong, SongReference, maxLengths } from "../constants"
export const AUDIOFORMAT: string = ".webm"

export function parseVideo(video: ytpl.Item, videoinfo: ytdl.videoInfo): Song {
    let titlesegments = video.title.split(" - ").slice(0,2)
    let artistindex = titlesegments.findIndex(segment => segment.includes(video.author.name) || video.author.name.toLowerCase().includes(segment.replaceAll(/\s/g,"").toLowerCase()))
    let postYear: number = -1;
    try {
        postYear = parseInt(videoinfo.videoDetails.uploadDate.split("-")[0])
    } catch (e) {
        console.warn("Invalid Video Upload Date: "+videoinfo.videoDetails.uploadDate)
    }
    return {
        id: video.id,

        title: (artistindex >= 0 ? titlesegments[(artistindex+1)%2]?.trim() : video.title) ?? "Unknown",
        artist: video.author.name.endsWith(" - Topic") ? video.author.name.slice(undefined,-8) : titlesegments.length === 2 && artistindex >= 0 ? titlesegments[artistindex] : video.author.name,
        releaseYear: postYear,
        genre: Genre.Unknown,
        length: video.durationSec ?? -1,
    }
}

export function getFullSong(rs: RatedSong): (RatedSong & SongReference) | null {
    const sr = Playlist.getSong(rs);
    return sr ? {...rs, ...sr} : null;
}

export function isSong(x: any): x is Song {
    return typeof x.id === "string" &&
        typeof x.title === "string" && x.title.length > 0 && x.title.length <= maxLengths.title &&
        typeof x.artist=== "string" && x.artist.length> 0 && x.artist.length<= maxLengths.artist&&
        typeof x.releaseYear === "number" && x.releaseYear>=-1 &&
        Object.keys(Genre).includes(x.genre) && 
        typeof x.length === "number";
}

export function isRatedSong(x: any): x is RatedSong {
    return typeof x.id === "string" &&
        typeof x.score === "number" &&
        !("tags" in x) || Array.isArray(x.tags);
}