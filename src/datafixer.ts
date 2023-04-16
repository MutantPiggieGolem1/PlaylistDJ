import fs, { existsSync } from "fs";
import { Genre, maxLengths, RatedSong, Song } from "./constants";
import { truncateString } from "./discord/util";
import { isRatedSong, isSong } from "./web/util";

function fixSong(v: any): Song {
    return isSong(v) ? v : {
        ...v,
        title: truncateString(v.title || "Unknown", maxLengths.title),
        artist: truncateString(v.artist || "Unknown Artist", maxLengths.artist),
        releaseYear: v.releaseYear ?? -1,
        genre: v.genre ?? Genre.Unknown
    }
}

function fixRatedSong(v: any): RatedSong {
    return isRatedSong(v) ? v : {
        id: v.id,
        score: v.score ?? 0,
        tags: v.tags ?? []
    }
}

export default async () => {
    const indexFile = './resources/music.json';
    const index = !fs.existsSync(indexFile) ? {} :
        Object.fromEntries(Object.entries(JSON.parse(await fs.promises.readFile(indexFile, 'utf8')))
            .filter(([k, v]: [string, any]) => {
                if (!v.file || !existsSync(v.file)) {
                    console.warn("Unlinked Song! "+k)
                    return false
                }
                return true
            })
            .map(([k, v]: [string, any]) => [k, fixSong(v)])
        )
    await fs.promises.writeFile(indexFile, JSON.stringify(index))
    console.info("[DataFixer] Index Done!")
    
    const playlistDir = './resources/playlists/';
    if (!fs.existsSync(playlistDir)) await fs.promises.mkdir(playlistDir);
    await Promise.all((await fs.promises.readdir(playlistDir,{withFileTypes:true}))
        .filter(ent=>ent.isFile())
        .map(file=>playlistDir+file.name)
        .map(async file=>{
            const songs: Set<string> = new Set();
            return fs.promises.writeFile(file, JSON.stringify(
                JSON.parse(await fs.promises.readFile(file, 'utf8'))
                .filter((v: any) => {
                    if (v.id in index && !songs.has(v.id)) {
                        songs.add(v.id);
                        return true;
                    }
                    return false;
                })
                .map(fixRatedSong)
            ))
        })
    )
    console.info("[DataFixer] Playlists Done!")
}