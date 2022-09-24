import fs from "fs";
import { AUDIOFORMAT, RatedSong, SongReference } from "./util";

export class Playlist { // Represents a playlist stored on the filesystem
    private static index: {[key: string]: SongReference};
    private static playlists: {[key: string]: Playlist};
    public static async init() {
        Playlist.index = fs.existsSync('./resources/music.json') ? JSON.parse(fs.readFileSync('./resources/music.json','utf8')) : {};
        Playlist.playlists = Object.fromEntries(
            fs.readdirSync(`./resources/playlists/`,{withFileTypes:true})
            .filter(ent=>ent.isFile())
            .map(file=>file.name.replace(".json", ""))
            .map(gid=>[gid, Playlist.fromFile(gid)])
        );
    }
    public static async save() {return fs.promises.writeFile('./resources/music.json',JSON.stringify(Playlist.index))}
    public static getPlaylist(id: undefined): typeof Playlist.playlists;
    public static getPlaylist(id: string): Playlist | null;
    public static getPlaylist(id: string | undefined): Playlist | typeof Playlist.playlists | null {return id ? Playlist.playlists[id] : Playlist.playlists}
    public static getSong(arg1: undefined): typeof Playlist.index;
    public static getSong(arg1: string | RatedSong): SongReference | null;
    public static getSong(arg1: RatedSong | string | undefined): SongReference | typeof Playlist.index | null {
        return arg1 ? Playlist.index[typeof arg1 === "string" ? arg1 : arg1.id] : Playlist.index
    }
    public static addSong(sr: SongReference) {Playlist.index[sr.id] = sr;}

    private guildid: string;
    private songs: RatedSong[];
    private static fromFile(gid: string): Playlist {
        const file: string = "./resources/playlists/"+gid;
        return new Playlist(gid, fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, {encoding: "utf8"})) as RatedSong[] : []);
    }
    public constructor(guildid: string, songs: RatedSong[]) { // this should be private.
        this.guildid = guildid;
        let eids: Set<string> = new Set<string>();
        this.songs = songs.filter(rs=>{
            if (eids.has(rs.id)) return false;
            eids.add(rs.id)
            return true;
        });
    }
    public async save() {return fs.promises.writeFile(`./resources/playlists/${this.guildid}.json`,JSON.stringify(this.songs))}
    get getSongs() {return this.songs;}
    get gid() {return this.guildid;}

    public vote(songid: string, voteup: boolean) {
        let index: number = this.songs.findIndex(i => i.id === songid)
        if (index < 0) return;
        this.songs[index].score += voteup ? 1 : -1;
    }

    public static async create(guildid: string, ids: string[]): Promise<Playlist> {
        if (Playlist.playlists[guildid]) return Promise.reject("This guild already has a playlist!")
        let items: RatedSong[] = ids.filter(id=>{
            const sr: SongReference | null = this.getSong(id);
            return sr && fs.existsSync(sr.file)
        }).map(id=>{return {score:0,...Playlist.index[id]}})
        if (items.length <= 0) return Promise.reject("Couldn't find any songs!")
        Playlist.playlists[guildid] = new Playlist(guildid, items);
        await Playlist.playlists[guildid].save()
        return Playlist.playlists[guildid];
    }

    public async delete() { // leaves lingering music, clean should be called later
        delete Playlist.playlists[this.guildid]
        return await fs.promises.rm(`./resources/playlists/${this.guildid}.json`)
    }

    public addSongs(ids: string[]): RatedSong[] {
        let added: RatedSong[] = ids
            .filter(id=>Playlist.index[id]&&this.songs.every(s=>s.id!==id)) // song in database & not in playlist
            .map(id=>{return {score:0,...Playlist.index[id]}}) // turn into ratedsongs
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
        const refs = new Set<string>(Object.values(Playlist.playlists).flatMap(pl=>pl.songs).map(s=>s.id));
        return this.delete(
            fs.readdirSync(`./resources/music/`,{withFileTypes:true})
                .filter(ent=>ent.isFile()) // all files
                .map(file=>file.name.replace(".json", "")) // all file ids
                .filter(sid=>!refs.has(sid)) // all unreferenced file ids
        );
    }

    public static delete(ids: string[]): Promise<string[]> { // destroy files from the filesystem
        ids.forEach(id=>delete Playlist.index[id]);
        return Playlist.save().then(_=>Promise.all(ids.map(id=>{
            let file = `./resources/music/${id}${AUDIOFORMAT}`;
            if (!fs.existsSync(file)) return false;
            return fs.promises.rm(file).then(_=>file).catch(_=>false)
        })).then(files=>files.filter((file): file is string => !!file)))
    }
}