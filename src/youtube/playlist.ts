import { MusicJSON, parseVideo, RealSong } from "./util";
import fs from "fs"
import { EventEmitter } from "stream";
import * as ytdsc from "ytdl-core-discord";
import ytpl from "ytpl";
import ytdl from "ytdl-core";

export class WebPlaylist {
    public ytplaylist: ytpl.Result;

    private constructor(r: ytpl.Result) {this.ytplaylist=r}
    public static async fromUrl(url: string): Promise<WebPlaylist> {
        if (!ytpl.validateID(url)) throw new Error("Invalid URL!")
        return new WebPlaylist(await ytpl(url, { limit: Number.POSITIVE_INFINITY }))
    }

    public remove(indices: number[]) {
        this.ytplaylist.items = this.ytplaylist.items.filter((_,i)=>!indices.includes(i))
    }

    public download(dir: string, clear?: boolean): EventEmitter {
        let ee: EventEmitter = new EventEmitter()

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        } else if (clear) {
            fs.rmdirSync(dir)
            fs.mkdirSync(dir);
        }

        let pdata: MusicJSON = {
            title: this.ytplaylist.title,
            directory: dir,
            url: this.ytplaylist.url,
            songs: clear ? [] : Playlist.getJSONSongs(dir)
        };
        ee.emit("start",this.ytplaylist.items)
        Promise.all(this.ytplaylist.items.map((playlistitem: ytpl.Item) => new Promise<void>(async (resolve, reject) => {
            let file: string = dir + playlistitem.id + ".ogg"
            fs.openSync(file, 'w') // create if not exists
            ytdl.getInfo(playlistitem.url).then((videoinfo: ytdl.videoInfo) => {
                ytdsc.downloadFromInfo(videoinfo, { quality: "highestaudio", filter: "audioonly" }).pipe(fs.createWriteStream(file))
                .on('finish', () => {
                    pdata.songs.push({ file, url: playlistitem.url , ...parseVideo(playlistitem, videoinfo) } as RealSong)
                    ee.emit("progress",pdata)
                    resolve()
                }).on('error', (e: Error) => {

                    reject(e);
                })
            }).catch((e: Error) => {ee.emit('warn', e); reject(e)})
        }))).then(() => {
            let playlist: Playlist = new Playlist(pdata);
            playlist.saveTo(dir)
            ee.emit("finish",playlist)
        }).catch(e=>ee.emit("error",e))
        return ee;
    }
}
export class Playlist { // Represents a youtube or data playlist
    private playlist: MusicJSON;

    public get playlistdata(): MusicJSON {
        return this.playlist;
    }

    public static getJSONSongs(dir: string) {
        if (!fs.existsSync(dir+"data.json")) return [];
        try {
            return (JSON.parse(fs.readFileSync(dir+"data.json").toString()) as MusicJSON).songs;
        } catch (e) {
            console.warn(e)
            return [];
        }
    }

    public constructor(pl: MusicJSON | string) {
        if (typeof pl === "string") {
            let file = fs.readFileSync(`./resources/music/${pl}/data.json`)?.toString();
            if (!file) throw new Error("Couldn't find playlist!");
            this.playlist = JSON.parse(file)
        } else {
            this.playlist = pl;
        }
    }

    public async removeSong(id: string) {
        if (this.playlist.songs.splice(this.playlist.songs.findIndex(rs=>rs.id===id),1).length <= 0) return false;
        fs.promises.rm(this.playlist.directory+id+".ogg").then(() => {
            
        })
    }

    public async saveTo(dir: string) {
        if (!fs.existsSync(dir)) {fs.mkdirSync(dir, { recursive: true })} 
        return fs.promises.writeFile(dir+"data.json",JSON.stringify(this.playlist))
    }
}