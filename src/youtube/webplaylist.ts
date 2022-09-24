import EventEmitter from "events"
import fs from "fs"
import ytdl from "ytdl-core"
import ytdsc from "ytdl-core-discord"
import ytpl from "ytpl"
import { Playlist } from "./playlist"
import { AUDIOFORMAT, parseVideo, SongReference } from "./util"

export class WebPlaylist {
    private static downloading: boolean = false;
    public ytplaylist: ytpl.Result;

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
        return Promise.reject("Invalid URL!");
    }
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

    public getIds() {
        return this.ytplaylist.items.map((i: ytpl.Item) => i.id);
    }

    public remove(indices: number[]) {
        this.ytplaylist.items = this.ytplaylist.items.filter((_: ytpl.Item,i: number)=>!indices.includes(i))
    }

    public download(guildid: string): EventEmitter {
        const ee: EventEmitter = new EventEmitter();
        setImmediate(() => {
            if (WebPlaylist.downloading) return ee.emit('error', new Error("Wait for the previous playlist to download first!"));
            WebPlaylist.downloading = true;
            
            let items: SongReference[] =
                Playlist.getPlaylist(guildid)?.getSongs
                ?.map(Playlist.getSong)?.filter((sr: SongReference | null): sr is SongReference => !!sr) || [];

            ee.emit("start",this.ytplaylist.items)
            let done: number = 0;
            Promise.allSettled(this.ytplaylist.items.map((playlistitem: ytpl.Item): Promise<void> => {
                const file = `./resources/music/${playlistitem.id}${AUDIOFORMAT}`
                if (fs.existsSync(file)) {
                    if (!items.some(i=>i.id===playlistitem.id)) {
                        items.push({ file, url: playlistitem.url , ...parseVideo(playlistitem) });
                    }
                    done++;
                    return Promise.resolve();
                }
                return ytdl.getInfo(playlistitem.url).then((videoinfo: ytdl.videoInfo) => new Promise<void>((resolve) => {
                    ytdsc.downloadFromInfo(videoinfo, { quality: "highestaudio", filter: "audioonly"})
                    .pipe(fs.createWriteStream(file, {fd: fs.openSync(file, 'w'), flags: "w"}))
                    .on('finish', () => {
                        items.push({ file, url: playlistitem.url , ...parseVideo(playlistitem, videoinfo) })
                        ee.emit("progress", ++done, this.ytplaylist.items.length, playlistitem.id);
                        resolve();
                    })
                })).catch((e: Error) => {
                    ee.emit('warn', ++done, this.ytplaylist.items.length, playlistitem.id, e);
                    if (fs.existsSync(file)) fs.rmSync(file);
                    let index = items.findIndex(sr=>sr.file===file);
                    if (index >= 0) items.splice(index,1)
                    throw e; // as to retain the rejected status
                })
            })).then(async (completion: Array<PromiseSettledResult<void>>) => {
                if (completion.every(r=>r.status==="rejected")) throw new Error("All downloads failed.");
                items.forEach(rs=>Playlist.getSong(rs.id) ? null : Playlist.addSong(rs as SongReference))
                await Playlist.save();
                let playlist: Playlist = new Playlist(guildid, items.map(sr=>{return {id: sr.id, tags: [], score: 0}}));
                await playlist.save();
                return playlist;
            }).then((playlist: Playlist)=>{
                ee.emit("finish",playlist)
            }).catch((e: Error)=>{
                ee.emit("error",e)
            }).finally(() => {
                WebPlaylist.downloading = false;
            })
        })
        return ee;
    }
}