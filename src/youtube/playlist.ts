import { AUDIOFORMAT, MusicJSON, parseVideo, RealSong } from "./util";
import fs from "fs"
import { EventEmitter } from "stream";
import * as ytdsc from "ytdl-core-discord";
import ytpl from "ytpl";
import ytdl from "ytdl-core";

export class WebPlaylist {
    public ytplaylist: ytpl.Result;

    private constructor(r: ytpl.Result) {this.ytplaylist=r}
    public static async fromUrl(url: string): Promise<WebPlaylist> {
        if (ytpl.validateID(url)) return new WebPlaylist(await ytpl(url, { limit: Number.POSITIVE_INFINITY }))
        if (ytdl.validateURL(url)) {
            let vi: ytdl.videoInfo = await ytdl.getBasicInfo(url);
            return new WebPlaylist({
                author: {
                    ...vi.videoDetails.author,
                    avatars: vi.videoDetails.author.thumbnails,
                    url: vi.videoDetails.author.user_url,
                    bestAvatar: vi.videoDetails.author.thumbnails ? vi.videoDetails.author.thumbnails.at(-1) : {url: "https://c.tenor.com/pMhSj9NfCXsAAAAC/saul-goodman-better-call-saul.gif", width: 498, height: 317},
                    channelID: vi.videoDetails.author.id
                },
                bestThumbnail: vi.videoDetails.thumbnails.at(-1),
                continuation: false,
                description: "Single Video Download",
                estimatedItemCount: 1,
                id: vi.videoDetails.videoId,
                items: [{
                    title: vi.videoDetails.title,
                    index: -1,
                    id: vi.videoDetails.videoId,
                    shortUrl: `youtu.be/${vi.videoDetails.videoId}`,
                    url: vi.videoDetails.video_url,
                    author: {
                        name: vi.videoDetails.author.name,
                        url: vi.videoDetails.author.channel_url,
                        channelID: vi.videoDetails.author.id
                    },
                    thumbnails: vi.videoDetails.thumbnails,
                    bestThumbnail: vi.videoDetails.thumbnails.at(-1),
                    isLive: false,
                    duration: `${Math.floor(parseInt(vi.videoDetails.lengthSeconds)/60)}m${parseInt(vi.videoDetails.lengthSeconds)%60}s`,
                    durationSec: parseInt(vi.videoDetails.lengthSeconds),
                } as ytpl.Item],
                lastUpdated: vi.videoDetails.uploadDate, // Incorrect date but i frankly dont care
                thumbnails: vi.videoDetails.thumbnails,
                title: vi.videoDetails.title,
                url: vi.videoDetails.video_url,
                views: parseInt(vi.videoDetails.viewCount),
                visibility: vi.is_listed ? "everyone" : "unlisted",
            } as ytpl.Result)
        }
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
            fs.readdirSync(directory).forEach((file: string) => {
                fs.rmSync(directory+file);
            });
        }

        let pdata: MusicJSON = {directory, url: [this.ytplaylist.url], items: []};
        ee.emit("start",this.ytplaylist.items)
        Promise.allSettled(this.ytplaylist.items.map((playlistitem: ytpl.Item) => new Promise<boolean>(async (resolve, reject) => {
            let file: string = directory + playlistitem.id + AUDIOFORMAT
            fs.openSync(file, 'w') // create if not exists
            ytdl.getInfo(playlistitem.url).then((videoinfo: ytdl.videoInfo) => {
                videoinfo.tag_for_children_directed ||
                ytdsc.downloadFromInfo(videoinfo, { quality: "highestaudio", filter: "audioonly"}).pipe(fs.createWriteStream(file))
                .on('finish', () => {
                    pdata.items.push({ file, url: playlistitem.url , ...parseVideo(playlistitem, videoinfo) } as RealSong)
                    ee.emit("progress",pdata)
                    resolve(true)
                }).on('error', reject)
            }).catch((e: Error) => {ee.emit('warn', e); reject(e)})
        }))).then((completion: Array<PromiseSettledResult<boolean>>) => {
            if (completion.every(r=>r.status==="rejected")) return ee.emit("finish",undefined);
            let odata: MusicJSON | undefined = clear ? undefined : new Playlist(directory).playlistdata
            if (odata) {
                pdata.url = [...new Set<string>([...pdata.url, ...odata.url])]
                pdata.items = pdata.items.concat(odata.items.filter(i=>pdata.items.every(p=>p.id!==i.id)))
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

    public async clean() {
        let paths: fs.Dirent[] = (await fs.promises.readdir(this.playlist.directory,{withFileTypes:true}))
            .filter(dirent=>dirent.isFile()&&(!dirent.name.endsWith(".json"))&&this.playlist.items.every(i=>i.file!==this.playlist.directory+dirent.name))
        return Promise.all(paths.map(p=>fs.promises.rm(this.playlist.directory+p.name)))
    }

    public async removeSong(id: string) {
        let song: RealSong;
        [song] = this.playlist.items.splice(this.playlist.items.findIndex(rs=>rs.id===id),1)
        if (!song) return false;
        return fs.promises.rm(song.file)
    }

    public async save() {
        if (!fs.existsSync(this.playlist.directory)) {fs.mkdirSync(this.playlist.directory, { recursive: true })} 
        return fs.promises.writeFile(this.playlist.directory+"data.json",JSON.stringify(this.playlist))
    }
}