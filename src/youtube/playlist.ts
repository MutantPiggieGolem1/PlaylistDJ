import fs from "fs";
import { EventEmitter } from "stream";
import ytdl from "ytdl-core";
import * as ytdsc from "ytdl-core-discord";
import ytpl from "ytpl";
import { AUDIOFORMAT, Genre, MusicJSON, parseVideo, RatedSong, SongReference } from "./util";

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

            const datafile = `./resources/playlists/${guildid}.json`
            let pdata: MusicJSON = {guildid, url: [this.ytplaylist.url], items: []};
            if (fs.existsSync(datafile)) {
                let opl: Playlist | undefined = getPlaylist(guildid);
                if (opl) {
                    let odata = opl.playlistdata
                    if (odata.url) pdata.url = [...new Set<string>([...pdata.url??[], ...odata.url])]
                    pdata.items = odata.items
                }
            }

            ee.emit("start",this.ytplaylist.items)
            let done: number = 0;
            Promise.allSettled(this.ytplaylist.items.map((playlistitem: ytpl.Item): Promise<void> => {
                const file = `./resources/music/${playlistitem.id}${AUDIOFORMAT}`
                if (fs.existsSync(file)) {
                    if (!pdata.items.some(i=>i.id===playlistitem.id)) {
                        pdata.items.push({ file, url: playlistitem.url , ...parseVideo(playlistitem) } as RatedSong);
                    }
                    done++;
                    return Promise.resolve();
                }
                return ytdl.getInfo(playlistitem.url).then((videoinfo: ytdl.videoInfo) => new Promise<void>((resolve) => {
                    ytdsc.downloadFromInfo(videoinfo, { quality: "highestaudio", filter: "audioonly"})
                    .pipe(fs.createWriteStream(file, {fd: fs.openSync(file, 'w'), flags: "w"}))
                    .on('finish', () => {
                        pdata.items.push({ file, url: playlistitem.url , ...parseVideo(playlistitem, videoinfo) } as RatedSong)
                        ee.emit("progress", ++done, this.ytplaylist.items.length, playlistitem.id);
                        resolve();
                    })
                })).catch((e: Error) => {
                    ee.emit('warn', ++done, this.ytplaylist.items.length, playlistitem.id, e);
                    if (fs.existsSync(file)) fs.rmSync(file);
                    let index = pdata.items.findIndex(rs=>rs.file===file);
                    if (index >= 0) pdata.items.splice(index,1)
                })
            })).then(async (completion: Array<PromiseSettledResult<void>>) => {
                if (completion.every(r=>r.status==="rejected")) return Promise.reject("All downloads failed.");
                pdata.items.forEach(rs=>Playlist.INDEX[rs.id]=Playlist.INDEX[rs.id] ?? (rs as SongReference))
                await Playlist.setMusicIndex();
                let playlist: Playlist = new Playlist(pdata);
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

export class Playlist { // Represents a playlist stored on the filesystem
    private playlist: MusicJSON;
    public get playlistdata(): MusicJSON {return this.playlist}
    public static INDEX: {[key: string]: SongReference} = fs.existsSync('./resources/music.json') ? JSON.parse(fs.readFileSync('./resources/music.json','utf8')) : {};
    public static async setMusicIndex() {return fs.promises.writeFile('./resources/music.json',JSON.stringify(Playlist.INDEX))}

    public vote(songid: string, voteup: boolean) {
        let index: number = this.playlist.items.findIndex(i => i.id === songid)
        if (index < 0) return;
        this.playlist.items[index].score += voteup ? 1 : -1;
    }

    public constructor(arg: MusicJSON) {
        let eids: Set<string> = new Set<string>();
        arg.items = arg.items.filter(rs=>{
            if (eids.has(rs.id) || !fs.existsSync(rs.file)) return false;
            eids.add(rs.id)
            return true;
        }).map(rs=>{
            if (!rs.artist) rs.artist = "Unknown Artist";
            if (!rs.genre) rs.genre = Genre.Unknown;
            if (!rs.score) rs.score = 0;
            if (!rs.title) rs.title = "Unknown"
            return rs;
        })
        this.playlist = arg;
    }

    public static async create(guildid: string, ids: string[], url?: string): Promise<Playlist> {
        if (getPlaylist(guildid)) return Promise.reject("This guild already has a playlist!")
        let items: RatedSong[] = ids.filter(id=>Object.keys(Playlist.INDEX).includes(id) && fs.existsSync(Playlist.INDEX[id].file)).map(id=>{return {score:0,...Playlist.INDEX[id]}})
        if (items.length <= 0) return Promise.reject("Couldn't find any songs!")
        playlists[guildid] = new Playlist({guildid,url,items} as MusicJSON);
        await playlists[guildid].save()
        return playlists[guildid];
    }

    public async delete() { // leaves lingering music, clean should be called later
        delete playlists[this.playlist.guildid]
        return await fs.promises.rm(`./resources/playlists/${this.playlist.guildid}.json`)
    }

    public addSongs(ids: string[]): RatedSong[] {
        let added: RatedSong[] = ids
            .filter(id=>Playlist.INDEX[id]&&this.playlist.items.every(s=>s.id!==id)) // song is in database & not in playlist
            .map(id=>{return {score:0,...Playlist.INDEX[id]}}) // turn into ratedsongs
        this.playlist.items = this.playlist.items.concat(added);
        return added;
    }
    public removeSongs(ids: string[]): RatedSong[] { // leaves lingering music, clean should be called later
        let removed: RatedSong[] = [];
        this.playlist.items = this.playlist.items.filter(i=>{
            if (!ids.includes(i.id)) {return true};
            removed.push(i);
            return false;
        });
        return removed;
    }

    public editSong(meta: RatedSong) {
        let index: number = this.playlist.items.findIndex(i => i.id === meta.id)
        if (index < 0) return;
        this.playlist.items[index] = meta;
    }

    public async save() { 
        return fs.promises.writeFile(`./resources/playlists/${this.playlist.guildid}.json`,JSON.stringify(this.playlist))
    }

    public static getAllPlaylists(asPlaylist: true): Promise<(Playlist | undefined)[]>
    public static getAllPlaylists(): Promise<MusicJSON[]>
    public static getAllPlaylists(asPlaylist: false): Promise<MusicJSON[]>
    public static getAllPlaylists(asPlaylist: boolean = false): Promise<(MusicJSON | Playlist | undefined)[]> {
        return Promise.all(Object.values(playlists).map(playlist => playlist.save()))
            .then(_=>fs.promises.readdir(`./resources/playlists/`,{withFileTypes:true}))
            .then(ents=>ents.filter(ent=>ent.isFile())
                .map(file=>{
                    if (asPlaylist) {
                        return getPlaylist(file.name.replace(".json",""));
                    } else {
                        return JSON.parse(fs.readFileSync(`./resources/playlists/${file.name}`).toString()) as MusicJSON
                    }
                })
            );
    }

    public static clean() {
        const ee = new EventEmitter();
        ee.emit('start')
        Promise.all([
            Playlist.getAllPlaylists().then((playlists: MusicJSON[]) => 
                playlists.flatMap(pl=>pl.items)
            ).then((items: RatedSong[]) => {
                playlists = {}; // clean global cache
                ee.emit('progress','Located all references!')
                return new Set<string>(items.map(i=>i.file))
            }),
            fs.promises.readdir(`./resources/music/`,{withFileTypes:true}).then(ents=>{
                ee.emit('progress','Located all music files!')
                return ents.filter(ent=>ent.isFile()).map((f: fs.Dirent)=>`./resources/music/${f.name}`)
            })
        ]).then(([refs, files]) => 
            Promise.all(
                files.filter(f=>!refs.has(f)) // all unreferenced files
                .map(f=>fs.promises.rm(f).then(_=>{ // remove them from the filesystem
                    files.splice(files.indexOf(f), 1); // remove them from the files
                    const song: SongReference | undefined = Object.values(Playlist.INDEX).find(s=>s.file===f);
                    if (song) delete Playlist.INDEX[song.id]; // remove from database
                    return f;
                }))
            ).then((rmfiles: string[])=>{
                Playlist.setMusicIndex();
                ee.emit('progress',`Removed all unrefrenced files (${rmfiles.length})!`)
                return [refs, files, rmfiles]
            }) // pass the args along to continue chaining
        ).then(([refs,files, rmfiles]) => {
            // TODO: improper lengths => redownload
            return [refs,files, rmfiles]
        }).then(([_,files,rmfiles])=>{
            ee.emit('finish',files,rmfiles)
        }).catch((e: Error) => ee.emit('error', e))
        return ee;
    }

    public static async delete(ids: string[]): Promise<string[]> {
        ids.forEach(id=>delete Playlist.INDEX[id]);
        await Playlist.setMusicIndex()
        await Playlist.getAllPlaylists(true).then(playlists =>Promise.all(playlists.map(pl=>{
            if (!pl) return;
            pl.removeSongs(ids);
            return pl.save();
        })))
        return Promise.all(ids.map(id=>{
            let file = `./resources/music/${id}${AUDIOFORMAT}`;
            if (!fs.existsSync(file)) return false;
            return fs.promises.rm(file).then(_=>file).catch(_=>false)
        })).then(files=>files.filter(file=>file) as string[])
    }
}

let playlists: {[key: string]: Playlist} = {};
export function getPlaylist(guildid: string): Playlist | undefined {
    if (!playlists[guildid]) {
        const ppath = `./resources/playlists/${guildid}.json`;
        if (fs.existsSync(ppath)) {try {
            playlists[guildid] = new Playlist(JSON.parse(fs.readFileSync(ppath).toString()) as MusicJSON)
        } catch (e) {return;}}
    }
    return playlists[guildid];
}