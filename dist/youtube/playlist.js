"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlaylist = exports.Playlist = exports.WebPlaylist = void 0;
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const stream_1 = require("stream");
const ytdl_core_1 = tslib_1.__importDefault(require("ytdl-core"));
const ytdsc = tslib_1.__importStar(require("ytdl-core-discord"));
const ytpl_1 = tslib_1.__importDefault(require("ytpl"));
const util_1 = require("./util");
class WebPlaylist {
    static downloading = false;
    ytplaylist;
    static async fromUrl(url) {
        if (ytpl_1.default.validateID(url))
            return new WebPlaylist(await (0, ytpl_1.default)(url, { limit: Number.POSITIVE_INFINITY }));
        if (ytdl_core_1.default.validateURL(url)) {
            let vi = await ytdl_core_1.default.getBasicInfo(url);
            return new WebPlaylist({
                author: {
                    ...vi.videoDetails.author,
                    avatars: vi.videoDetails.author.thumbnails,
                    url: vi.videoDetails.author.user_url,
                    bestAvatar: vi.videoDetails.author.thumbnails ? vi.videoDetails.author.thumbnails.at(-1) : { url: "https://c.tenor.com/pMhSj9NfCXsAAAAC/saul-goodman-better-call-saul.gif", width: 498, height: 317 },
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
                        duration: `${Math.floor(parseInt(vi.videoDetails.lengthSeconds) / 60)}m${parseInt(vi.videoDetails.lengthSeconds) % 60}s`,
                        durationSec: parseInt(vi.videoDetails.lengthSeconds),
                    }],
                lastUpdated: vi.videoDetails.uploadDate,
                thumbnails: vi.videoDetails.thumbnails,
                title: vi.videoDetails.title,
                url: vi.videoDetails.video_url,
                views: parseInt(vi.videoDetails.viewCount),
                visibility: vi.is_listed ? "everyone" : "unlisted",
            });
        }
        return Promise.reject("Invalid URL!");
    }
    constructor(r) {
        let eids = new Set();
        r.items = r.items.filter(i => {
            if (!eids.has(i.id)) {
                eids.add(i.id);
                return true;
            }
        });
        this.ytplaylist = r;
    }
    getIds() {
        return this.ytplaylist.items.map((i) => i.id);
    }
    remove(indices) {
        this.ytplaylist.items = this.ytplaylist.items.filter((_, i) => !indices.includes(i));
    }
    download(guildid) {
        const ee = new stream_1.EventEmitter();
        setImmediate(() => {
            if (WebPlaylist.downloading)
                return ee.emit('error', new Error("Wait for the previous playlist to download first!"));
            WebPlaylist.downloading = true;
            const datafile = `./resources/playlists/${guildid}.json`;
            let pdata = { guildid, url: [this.ytplaylist.url], items: [] };
            if (fs_1.default.existsSync(datafile)) {
                let opl = getPlaylist(guildid);
                if (opl) {
                    let odata = opl.playlistdata;
                    if (odata.url)
                        pdata.url = [...new Set([...pdata.url ?? [], ...odata.url])];
                    pdata.items = odata.items;
                }
            }
            ee.emit("start", this.ytplaylist.items);
            let done = 0;
            Promise.allSettled(this.ytplaylist.items.map((playlistitem) => {
                const file = `./resources/music/${playlistitem.id}${util_1.AUDIOFORMAT}`;
                if (fs_1.default.existsSync(file)) {
                    if (!pdata.items.some(i => i.id === playlistitem.id)) {
                        pdata.items.push({ file, url: playlistitem.url, ...(0, util_1.parseVideo)(playlistitem) });
                    }
                    done++;
                    return Promise.resolve();
                }
                return ytdl_core_1.default.getInfo(playlistitem.url).then((videoinfo) => new Promise((resolve) => {
                    ytdsc.downloadFromInfo(videoinfo, { quality: "highestaudio", filter: "audioonly" })
                        .pipe(fs_1.default.createWriteStream(file, { fd: fs_1.default.openSync(file, 'w'), flags: "w" }))
                        .on('finish', () => {
                        pdata.items.push({ file, url: playlistitem.url, ...(0, util_1.parseVideo)(playlistitem, videoinfo) });
                        ee.emit("progress", ++done, this.ytplaylist.items.length, playlistitem.id);
                        resolve();
                    });
                })).catch((e) => {
                    ee.emit('warn', ++done, this.ytplaylist.items.length, playlistitem.id, e);
                    if (fs_1.default.existsSync(file))
                        fs_1.default.rmSync(file);
                    let index = pdata.items.findIndex(rs => rs.file === file);
                    if (index >= 0)
                        pdata.items.splice(index, 1);
                    throw e;
                });
            })).then(async (completion) => {
                if (completion.every(r => r.status === "rejected"))
                    throw new Error("All downloads failed.");
                pdata.items.forEach(rs => Playlist.INDEX[rs.id] = Playlist.INDEX[rs.id] ?? rs);
                await Playlist.setMusicIndex();
                let playlist = new Playlist(pdata);
                await playlist.save();
                return playlist;
            }).then((playlist) => {
                ee.emit("finish", playlist);
            }).catch((e) => {
                ee.emit("error", e);
            }).finally(() => {
                WebPlaylist.downloading = false;
            });
        });
        return ee;
    }
}
exports.WebPlaylist = WebPlaylist;
class Playlist {
    playlist;
    get playlistdata() { return this.playlist; }
    static INDEX = fs_1.default.existsSync('./resources/music.json') ? JSON.parse(fs_1.default.readFileSync('./resources/music.json', 'utf8')) : {};
    static async setMusicIndex() { return fs_1.default.promises.writeFile('./resources/music.json', JSON.stringify(Playlist.INDEX)); }
    vote(songid, voteup) {
        let index = this.playlist.items.findIndex(i => i.id === songid);
        if (index < 0)
            return;
        this.playlist.items[index].score += voteup ? 1 : -1;
    }
    constructor(arg) {
        let eids = new Set();
        arg.items = arg.items.filter(rs => {
            if (eids.has(rs.id) || !fs_1.default.existsSync(rs.file))
                return false;
            eids.add(rs.id);
            return true;
        }).map(rs => {
            if (!rs.artist)
                rs.artist = "Unknown Artist";
            if (!rs.genre)
                rs.genre = util_1.Genre.Unknown;
            if (!rs.score)
                rs.score = 0;
            if (!rs.title)
                rs.title = "Unknown";
            return rs;
        });
        this.playlist = arg;
    }
    static async create(guildid, ids, url) {
        if (getPlaylist(guildid))
            return Promise.reject("This guild already has a playlist!");
        let items = ids.filter(id => Object.keys(Playlist.INDEX).includes(id) && fs_1.default.existsSync(Playlist.INDEX[id].file)).map(id => { return { score: 0, ...Playlist.INDEX[id] }; });
        if (items.length <= 0)
            return Promise.reject("Couldn't find any songs!");
        playlists[guildid] = new Playlist({ guildid, url, items });
        await playlists[guildid].save();
        return playlists[guildid];
    }
    async delete() {
        delete playlists[this.playlist.guildid];
        return await fs_1.default.promises.rm(`./resources/playlists/${this.playlist.guildid}.json`);
    }
    addSongs(ids) {
        let added = ids
            .filter(id => Playlist.INDEX[id] && this.playlist.items.every(s => s.id !== id))
            .map(id => { return { score: 0, ...Playlist.INDEX[id] }; });
        this.playlist.items = this.playlist.items.concat(added);
        return added;
    }
    removeSongs(ids) {
        let removed = [];
        this.playlist.items = this.playlist.items.filter(i => {
            if (!ids.includes(i.id)) {
                return true;
            }
            ;
            removed.push(i);
            return false;
        });
        return removed;
    }
    editSong(meta) {
        let index = this.playlist.items.findIndex(i => i.id === meta.id);
        if (index < 0)
            return;
        this.playlist.items[index] = meta;
    }
    async save() {
        return fs_1.default.promises.writeFile(`./resources/playlists/${this.playlist.guildid}.json`, JSON.stringify(this.playlist));
    }
    static getAllPlaylists(asPlaylist = false) {
        return Promise.all(Object.values(playlists).map(playlist => playlist.save()))
            .then(_ => fs_1.default.promises.readdir(`./resources/playlists/`, { withFileTypes: true }))
            .then(ents => ents.filter(ent => ent.isFile())
            .map(file => {
            if (asPlaylist) {
                return getPlaylist(file.name.replace(".json", ""));
            }
            else {
                return JSON.parse(fs_1.default.readFileSync(`./resources/playlists/${file.name}`).toString());
            }
        }));
    }
    static clean() {
        const ee = new stream_1.EventEmitter();
        ee.emit('start');
        Promise.all([
            Playlist.getAllPlaylists().then((playlists) => playlists.flatMap(pl => pl.items)).then((items) => {
                playlists = {};
                ee.emit('progress', 'Located all references!');
                return new Set(items.map(i => i.file));
            }),
            fs_1.default.promises.readdir(`./resources/music/`, { withFileTypes: true }).then(ents => {
                ee.emit('progress', 'Located all music files!');
                return ents.filter(ent => ent.isFile()).map((f) => `./resources/music/${f.name}`);
            })
        ]).then(([refs, files]) => Promise.all(files.filter(f => !refs.has(f))
            .map(f => fs_1.default.promises.rm(f).then(_ => {
            files.splice(files.indexOf(f), 1);
            const song = Object.values(Playlist.INDEX).find(s => s.file === f);
            if (song)
                delete Playlist.INDEX[song.id];
            return f;
        }))).then((rmfiles) => {
            Playlist.setMusicIndex();
            ee.emit('progress', `Removed all unrefrenced files (${rmfiles.length})!`);
            return [refs, files, rmfiles];
        })).then(([refs, files, rmfiles]) => {
            return [refs, files, rmfiles];
        }).then(([_, files, rmfiles]) => {
            ee.emit('finish', files, rmfiles);
        }).catch((e) => ee.emit('error', e));
        return ee;
    }
    static async delete(ids) {
        ids.forEach(id => delete Playlist.INDEX[id]);
        await Playlist.setMusicIndex();
        await Playlist.getAllPlaylists(true).then(playlists => Promise.all(playlists.map(pl => {
            if (!pl)
                return;
            pl.removeSongs(ids);
            return pl.save();
        })));
        return Promise.all(ids.map(id => {
            let file = `./resources/music/${id}${util_1.AUDIOFORMAT}`;
            if (!fs_1.default.existsSync(file))
                return false;
            return fs_1.default.promises.rm(file).then(_ => file).catch(_ => false);
        })).then(files => files.filter(file => file));
    }
}
exports.Playlist = Playlist;
let playlists = {};
function getPlaylist(guildid) {
    if (!playlists[guildid]) {
        const ppath = `./resources/playlists/${guildid}.json`;
        if (fs_1.default.existsSync(ppath)) {
            try {
                playlists[guildid] = new Playlist(JSON.parse(fs_1.default.readFileSync(ppath).toString()));
            }
            catch (e) {
                return;
            }
        }
    }
    return playlists[guildid];
}
exports.getPlaylist = getPlaylist;
