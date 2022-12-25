import { Playlist } from "./playlist"
import ytdl from "ytdl-core"
import ytpl from "ytpl"
import { Song, Genre, RatedSong, SongReference } from "../constants"
export const AUDIOFORMAT: string = ".webm"

export function parseVideo(video: ytpl.Item, videoinfo: ytdl.videoInfo): Song {
    let titlesegments = video.title.split(" - ").slice(0,2)
    let artistindex = titlesegments.findIndex(segment => segment.includes(video.author.name) || video.author.name.toLowerCase().includes(segment.replaceAll(/\s/g,"").toLowerCase()))
    return {
        id: video.id,

        title: artistindex >= 0 ? titlesegments[(artistindex+1)%2]?.trim() : videoinfo?.videoDetails.title ?? video.title ?? "<Unknown>",
        artist: video.author.name.endsWith(" - Topic") ? video.author.name.slice(undefined,-8) : titlesegments.length === 2 && artistindex >= 0 ? titlesegments[artistindex] : video.author.name,
        releaseYear: -1, // info.videoDetails.uploadDate
        genre: Genre.Unknown,
        length: video.durationSec ?? -1,
    }
}

export function getFullSong(rs: RatedSong): (RatedSong & SongReference) | null {
    const sr = Playlist.getSong(rs);
    return sr ? {...rs, ...sr} : null;
}
