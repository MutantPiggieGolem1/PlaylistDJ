import { AUDIOFORMAT, Genre, MusicJSON, parseVideo, RealSong } from "./util";
import fs from "fs"
import { EventEmitter } from "stream";
import * as ytdsc from "ytdl-core-discord";
import ytpl from "ytpl";
import ytdl from "ytdl-core";

export class WebPlaylist {
    public ytplaylist: ytpl.Result;

    private constructor(r: ytpl.Result) {
        let eids: Set<string> = new Set();
        r.items = r.items.filter(i=>{
            if (!eids.has(i.id)) {
                eids.add(i.id)
                return true
            }
        }) // Remove duplicate ids
        this.ytplaylist=r
    }
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
        this.ytplaylist.items = this.ytplaylist.items.filter((_: ytpl.Item,i: number)=>!indices.includes(i))
    }

    public download(guildid: string): EventEmitter {
        let ee: EventEmitter = new EventEmitter();

        const directory = `./resources/playlists/${guildid}.json`
        let pdata: MusicJSON = {guildid, url: [this.ytplaylist.url], items: []};
        if (fs.existsSync(directory)) {try {
            let odata: MusicJSON = new Playlist(guildid).playlistdata;
            pdata.url = [...new Set<string>([...pdata.url, ...odata.url])]
            pdata.items = odata.items
        } catch (e) {}}

        let done: number, total: number = this.ytplaylist.items.length;
        ee.emit("start",this.ytplaylist.items)
        Promise.allSettled(this.ytplaylist.items.map((playlistitem: ytpl.Item) => {
            const file = `./resources/music/${playlistitem.id}${AUDIOFORMAT}`
            if (fs.existsSync(file)) {pdata.items.push({ file, url: playlistitem.url , ...parseVideo(playlistitem) } as RealSong);total--;return Promise.resolve();}
            return Promise.race([new Promise<void>(async (resolve,reject) => {
                try {
                    let videoinfo: ytdl.videoInfo = await ytdl.getInfo(playlistitem.url)
                    ytdsc.downloadFromInfo(videoinfo, { quality: "highestaudio", filter: "audioonly"}).pipe(fs.createWriteStream(file, {
                        fd: fs.openSync(file, 'w'), flags: "w"
                    })).on('finish', () => {
                        pdata.items.push({ file, url: playlistitem.url , ...parseVideo(playlistitem, videoinfo) } as RealSong)
                        ee.emit("progress",++done,total);
                        resolve()
                    })
                } catch (e) {ee.emit('warn', done, --total, e); return reject(e)}
            }),new Promise<void>((_,reject) => {
                setTimeout(()=>{
                    if (fs.existsSync(file)) fs.rmSync(file); // cleanup partial progress
                    ee.emit('warn', done, --total, new Error(`Skipped \`${playlistitem.id}\` (timeout).`))
                    reject()
                },150*1000)
            })])
        })).then((completion: Array<PromiseSettledResult<void>>) => {
            if (completion.every(r=>r.status==="rejected")) return ee.emit("finish",undefined);
            let playlist: Playlist = new Playlist(pdata);
            playlist.save()
            ee.emit("finish",playlist)
        }).catch(e=>ee.emit("error",e))
        return ee;
    }
}

export class Playlist { // Represents a playlist stored on the filesystem
    private playlist: MusicJSON;

    public get playlistdata(): MusicJSON {
        return this.playlist;
    }

    public set setSong(meta: RealSong) {
        let index: number = this.playlist.items.findIndex(i => i.id === meta.id)
        if (index < 0) return;
        this.playlist.items[index] = meta;
    }

    public vote(songid: string, voteup: boolean) {
        let index: number = this.playlist.items.findIndex(i => i.id === songid)
        if (index < 0) return;
        this.playlist.items[index].score += voteup ? 1 : -1;
    }

    public constructor(guildid: MusicJSON | string) {
        if (typeof guildid === "string") {
            if (!fs.existsSync(`./resources/playlists/${guildid}.json`)) throw new Error("Couldn't find playlist!")
            this.playlist = JSON.parse(fs.readFileSync(`./resources/playlists/${guildid}.json`).toString()) as MusicJSON
        } else {
            this.playlist = guildid;
        }
    }

    public async removeSongs(ids: string[]): Promise<undefined | RealSong[]> {
        let dqueue: string[] = []; // not strictly neccesarry, ends up identical to ids
        let songs: RealSong[] = await Promise.all(this.playlist.items.filter(rs=>ids.includes(rs.id)).map(async (i): Promise<RealSong>=>{
            dqueue.push(i.id);
            if (fs.existsSync(i.file)) await fs.promises.rm(i.file)
            return i
        }))
        this.playlist.items = this.playlist.items.filter((i)=>!dqueue.includes(i.id));
        return songs;
    }

    public async save() {
        return fs.promises.writeFile(`./resources/playlists/${this.playlist.guildid}.json`,JSON.stringify(this.playlist))
    }
}

const playlists: {[key: string]: Playlist} = {};
export function getPlaylist(guildid: string): Playlist {
    if (!playlists[guildid]) playlists[guildid] = new Playlist(guildid);
    return playlists[guildid];
}