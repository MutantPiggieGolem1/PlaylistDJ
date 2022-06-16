import { AUDIOFORMAT, MusicJSON, parseVideo, RealSong } from "./util";
import fs from "fs"
import { EventEmitter } from "stream";
import * as ytdsc from "ytdl-core-discord";
import ytpl from "ytpl";
import ytdl from "ytdl-core";
import prism from "prism-media";

export class WebPlaylist {
    public ytplaylist: ytpl.Result;

    private constructor(r: ytpl.Result) {this.ytplaylist=r}
    public static async fromUrl(url: string): Promise<WebPlaylist> {
        if (ytpl.validateID(url)) return new WebPlaylist(await ytpl(url, { limit: Number.POSITIVE_INFINITY }))
        throw new Error("Invalid URL!")
    }

    public remove(indices: number[]) {
        this.ytplaylist.items = this.ytplaylist.items.filter((_,i)=>!indices.includes(i))
    }

    public download(directory: string, clear?: boolean): EventEmitter {
        let ee: EventEmitter = new EventEmitter()

        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        } else if (clear) {
            fs.rmdirSync(directory)
            fs.mkdirSync(directory);
        }

        let pdata: MusicJSON = {directory, url: [this.ytplaylist.url], items: []};
        ee.emit("start",this.ytplaylist.items)
        Promise.all(this.ytplaylist.items.map((playlistitem: ytpl.Item) => new Promise<void>(async (resolve, reject) => {
            let file: string = directory + playlistitem.id + AUDIOFORMAT
            fs.openSync(file, 'w') // create if not exists
            ytdl.getInfo(playlistitem.url).then((videoinfo: ytdl.videoInfo) => {
                ytdsc.downloadFromInfo(videoinfo, { quality: "highestaudio", filter: "audioonly"}).pipe(fs.createWriteStream(file))
                .on('finish', () => {
                    pdata.items.push({ file, url: playlistitem.url , ...parseVideo(playlistitem, videoinfo) } as RealSong)
                    ee.emit("progress",pdata)
                    resolve()
                }).on('error', (e: Error) => {

                    reject(e);
                })
            }).catch((e: Error) => {ee.emit('warn', e); resolve()})
        }))).then(() => {
            let odata: MusicJSON | undefined = clear ? undefined : new Playlist(directory).playlistdata
            if (odata) {
                pdata.url = pdata.url.concat(odata.url);
                pdata.items = pdata.items.concat(odata.items)
            }
            let playlist: Playlist = new Playlist(pdata);
            playlist.save()
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

    public constructor(pl: MusicJSON | string) {
        if (typeof pl === "string") {
            let file: string;
            try {
                file = fs.readFileSync(`./resources/music/${pl}/data.json`).toString()
            } catch (e) {
                try {
                    file = fs.readFileSync(pl+"data.json").toString()
                } catch (e) {
                    throw new Error("Couldn't find playlist!");
                }
            }
            this.playlist = JSON.parse(file) as MusicJSON
        } else {
            this.playlist = pl;
        }
    }

    public async removeSong(id: string) {
        if (this.playlist.items.splice(this.playlist.items.findIndex(rs=>rs.id===id),1).length <= 0) return false;
        return fs.promises.rm(this.playlist.directory+id+AUDIOFORMAT)
    }

    public async save() {
        if (!fs.existsSync(this.playlist.directory)) {fs.mkdirSync(this.playlist.directory, { recursive: true })} 
        return fs.promises.writeFile(this.playlist.directory+"data.json",JSON.stringify(this.playlist))
    }

    public async reencode() {
        throw new Error("no");
        // if (!fs.existsSync(this.playlist.directory)) throw new Error("Provided directory doesn't exist!");
        // let volumeTransformer: prism.VolumeTransformer = new prism.VolumeTransformer({ type: 's16le'});
        // volumeTransformer.setVolumeDecibels(20)
        // volumeTransformer.setMaxListeners(20)
        // return Promise.all(this.playlist.items.map((item,i) => new Promise((resolve,reject) => {
        //     fs.createReadStream(item.file)
        //         .pipe(new prism.opus.OggDemuxer())
        //         .pipe(new prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 }))
        //         .pipe(volumeTransformer)
        //         .pipe(new prism.opus.Encoder({ rate: 48000, channels: 2, frameSize: 960 }))
        //         .pipe(fs.createWriteStream(this.playlist.directory+"/"+item.id+AUDIOFORMAT))
        //         .on('finish', (arg: any) => {
        //            
        //             this.playlist.items[i].file = this.playlist.directory+"/"+item.id+AUDIOFORMAT
        //             resolve(arg) Must delete old file here, also fix listeners
        //         })
        //         .on('error',reject)
        // }))).then(() => {this.save()})
    }
}