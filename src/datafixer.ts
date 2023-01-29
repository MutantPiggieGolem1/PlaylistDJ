import fs from "fs";
import { Genre, maxLengths } from "./constants";
import { truncateString } from "./discord/util";
import { isRatedSong, isSong } from "./web/util";

export default async () => {
    const indexFile = './resources/music.json';
    const index = !fs.existsSync(indexFile) ? {} :
        Object.fromEntries(Object.entries(JSON.parse(await fs.promises.readFile(indexFile, 'utf8')))
            .map(([k, v]: [string, any]) => [k, isSong(v) ? v : {
                ...v,
                title: truncateString(v.title || "Unknown", maxLengths.title),
                artist: truncateString(v.artist || "Unknown Artist", maxLengths.artist),
                releaseYear: v.releaseYear ?? -1,
                genre: v.genre ?? Genre.Unknown
            }])
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
                .map((v: any) => isRatedSong(v) ? v : {
                    id: v.id,
                    score: v.score ?? 0,
                    tags: v.tags ?? []
                })
            ))
        })
    )
    console.info("[DataFixer] Playlists Done!")
}