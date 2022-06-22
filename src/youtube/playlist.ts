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

        let done: number = 0, total: number = this.ytplaylist.items.length;
        ee.emit("start",this.ytplaylist.items)
        Promise.allSettled(this.ytplaylist.items.map((playlistitem: ytpl.Item) => {
            const file = `./resources/music/${playlistitem.id}${AUDIOFORMAT}`
            if (fs.existsSync(file)) {pdata.items.push({ file, url: playlistitem.url , ...parseVideo(playlistitem) } as RealSong);done++;return Promise.resolve();}
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
                    let index: number = pdata.items.findIndex(i=>i.file===file); // cleanup partial progress
                    if (index) pdata.items.splice(index,1)                       //    |
                    if (fs.existsSync(file)) fs.rmSync(file);                    // ___/
                    ee.emit('warn', done, total, new Error(`Skipped \`${playlistitem.id}\` (timeout).`)) // !important! May have to decrement here but i err on the safe si
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

    public constructor(arg: MusicJSON | string) {
        if (typeof arg === "string") {
            if (!fs.existsSync(`./resources/playlists/${arg}.json`)) throw new Error("Couldn't find playlist!")
            this.playlist = JSON.parse(fs.readFileSync(`./resources/playlists/${arg}.json`).toString()) as MusicJSON
        } else {
            this.playlist = arg;
        }
    }

    public removeSongs(ids: string[]): RealSong[] {
        let removed: RealSong[] = [];
        this.playlist.items = this.playlist.items.filter(i=>{if (!ids.includes(i.id)) {return true}; removed.push(i)});
        return removed;
    }

    public async save() { 
        return fs.promises.writeFile(`./resources/playlists/${this.playlist.guildid}.json`,JSON.stringify(this.playlist))
    }

    public static clean() {
        const ee = new EventEmitter();
        ee.emit('start')
        Promise.all([
            fs.promises.readdir(`./resources/playlists/`,{withFileTypes:true}).then(ents=>
                ents.filter(ent=>ent.isFile()).map(file=>JSON.parse(fs.readFileSync(`./resources/playlists/${file.name}`).toString()) as MusicJSON)
            ).then((playlists: MusicJSON[]) => 
                playlists.flatMap(pl=>pl.items)
            ).then((items: RealSong[]) => {
                ee.emit('progress','Located all references!')
                return new Set<string>(items.map(i=>i.file))
            }),
            fs.promises.readdir(`./resources/music/`,{withFileTypes:true}).then(ents=>{
                ee.emit('progress','Located all music files!')
                return ents.filter(ent=>ent.isFile()).map((f: fs.Dirent)=>`./resources/music/${f.name}`)
            })
        ]).then(([refs, files]) => 
            Promise.all(files.filter(f=>!refs.has(f)).map(f=>fs.promises.rm(f).then(_=>f))) // remove all unrefrenced files
            .then((rmfiles: string[])=>{
                ee.emit('progress',`Removed all unrefrenced files (${rmfiles.length})!`)
                return [refs,files.filter(f=>!rmfiles.includes(f))]
            }) // pass the args along to continue chaining
        ).then(([refs,files]) => {
            // TODO: improper lengths => redownload
            return [refs,files]
        }).then(([_,files])=>{
            ee.emit('finish',files)
        }).catch((e: Error) => ee.emit('error', e))
        return ee;
    }
}

const playlists: {[key: string]: Playlist} = {};
export function getPlaylist(guildid: string): Playlist {
    if (!playlists[guildid]) playlists[guildid] = new Playlist(guildid);
    return playlists[guildid];
}