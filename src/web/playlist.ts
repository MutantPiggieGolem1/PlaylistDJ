import fs from "fs";
import { RatedSong, SongReference, Genre } from "../constants";
import { AUDIOFORMAT, isSong } from "./util";

export class Playlist { // Represents a playlist stored on the filesystem
    private static index: {[key: string]: SongReference};
    private static playlists: {[key: string]: Playlist};
    public static init() {
        Playlist.index = !fs.existsSync('./resources/music.json') ? {} :
            Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync('./resources/music.json','utf8'))).map(([k, v]: [string, any]) => [k, isSong(v) ? v : {...v,
                title: v.title ?? "Unknown",
                artist:v.artist?? "Unknown Artist",
                releaseYear: v.releaseYear?? -1,
                genre: v.genre ?? Genre.Unknown
            }])); // DFU
        if (!fs.existsSync('./resources/playlists/')) fs.mkdirSync(`./resources/playlists/`);
        Playlist.playlists = Object.fromEntries(
            fs.readdirSync(`./resources/playlists/`,{withFileTypes:true})
            .filter(ent=>ent.isFile())
            .map(file=>file.name.replace(".json", ""))
            .map(gid=>[gid, Playlist.fromFile(gid)])
        );
    }
    public static save() {return fs.promises.writeFile('./resources/music.json',JSON.stringify(Playlist.index))}
    public static getPlaylist(): typeof Playlist.playlists;
    public static getPlaylist(id: string): Playlist | null;
    public static getPlaylist(id: string | void): Playlist | typeof Playlist.playlists | null {return id ? Playlist.playlists[id] : Playlist.playlists}
    public static getSong(): typeof Playlist.index;
    public static getSong(arg1: string | RatedSong): SongReference | null;
    public static getSong(arg1: RatedSong | string | void): SongReference | typeof Playlist.index | null {
        return arg1 ? Playlist.index[typeof arg1 === "string" ? arg1 : arg1.id] : Playlist.index
    }
    public static addSong(sr: SongReference) {Playlist.index[sr.id] = sr;}

    private guildid: string;
    private songs: RatedSong[];
    private static fromFile(gid: string): Playlist {
        const file: string = "./resources/playlists/"+gid+".json";
        return new Playlist(gid, fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, {encoding: "utf-8"})).map((a: any)=>{return {id: a.id, tags: a.tags, score: a.score}}) : []);
    }
    public constructor(guildid: string, songs: RatedSong[] | void) { // this should be private.
        this.guildid = guildid;
        let eids: Set<string> = new Set<string>();
        this.songs = songs?.filter(rs=>{
            if (eids.has(rs.id)) return false;
            eids.add(rs.id)
            return true;
        }) ?? [];
    }
    public save() {
        if (!Playlist.playlists[this.guildid]) Playlist.playlists[this.guildid] = this;
        return fs.promises.writeFile(`./resources/playlists/${this.guildid}.json`,JSON.stringify(this.songs))
    };
    get getSongs() {return this.songs;}
    get gid() {return this.guildid;}

    public vote(songid: string, voteup: boolean) {
        let index: number = this.songs.findIndex(i => i.id === songid)
        if (index < 0) return;
        this.songs[index].score += voteup ? 1 : -1;
    }

    public static create(guildid: string, ids: string[] | Set<string>): Promise<Playlist> {
        if (Playlist.playlists[guildid]) return Promise.reject("This guild already has a playlist!")
        if (ids instanceof Set) ids = [...ids];
        let items: RatedSong[] = ids.filter(id=>{
            const sr: SongReference | null = this.getSong(id);
            return sr && fs.existsSync(sr.file)
        }).map(id=>{return {score:0,...Playlist.index[id]}})
        if (items.length <= 0) return Promise.reject("Couldn't find any songs!")
        return new Playlist(guildid, items).save().then(()=>Playlist.playlists[guildid]);
    }

    public delete() { // leaves lingering music, clean should be called later
        delete Playlist.playlists[this.guildid]
        return fs.promises.rm(`./resources/playlists/${this.guildid}.json`)
    }

    public addSongs(ids: string[]): RatedSong[] {
        let added: RatedSong[] = ids
            .filter(id=>Playlist.index[id]&&this.songs.every(s=>s.id!==id)) // song in database & not in playlist
            .map(id=>{return {score:0,tags:[],...Playlist.index[id]}}) // turn into ratedsongs
        this.songs = this.songs.concat(added);
        return added;
    }
    public removeSongs(ids: string[]): RatedSong[] { // leaves lingering music, clean should be called later
        let removed: RatedSong[] = [];
        this.songs = this.songs.filter(i=>{
            if (!ids.includes(i.id)) {return true};
            removed.push(i);
            return false;
        });
        return removed;
    }

    public editSong(meta: RatedSong) {
        let index: number = this.songs.findIndex(i => i.id === meta.id)
        if (index < 0) return;
        this.songs[index] = meta;
    }

    public static clean(): Promise<string[]> {        
        const refs = new Set<string>(Object.values(Playlist.getPlaylist()).flatMap(pl=>pl.songs).map(s=>s.id));
        return this.delete(
            fs.readdirSync(`./resources/music/`,{withFileTypes:true})
                .filter(ent=>ent.isFile()) // all files
                .map(file=>file.name.replace(AUDIOFORMAT, "")) // all file ids
                .filter(sid=>!refs.has(sid)) // all unreferenced file ids
        );
    }

    public static delete(ids: string[]): Promise<string[]> { // destroy files from the filesystem
        const files = ids.filter(id=>id in Playlist.index).map(id=>Playlist.index[id].file);
        ids.forEach(id=>delete Playlist.index[id])
        return Playlist.save().then(_=>Promise.all(files.map(file=>{
            if (!fs.existsSync(file)) return false;
            return fs.promises.rm(file).then(_=>file).catch(_=>false)
        })).then(files=>files.filter((file): file is string => !!file)))
    }
}