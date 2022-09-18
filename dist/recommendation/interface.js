"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCsv = exports.getAllCsvs = exports.saveAllPlaylists = void 0;
const tslib_1 = require("tslib");
const child_process_1 = require("child_process");
const fs_1 = tslib_1.__importDefault(require("fs"));
const util_1 = require("../discord/util");
const playlist_1 = require("../youtube/playlist");
const util_2 = require("../youtube/util");
function get(gid) {
    const playlist = (0, playlist_1.getPlaylist)(gid);
    if (!playlist)
        throw new Error(util_1.ERRORS.NO_PLAYLIST);
    return run([0, playlist.playlistdata.items.length - 1]).then(raw => Number.parseInt(raw)).then(index => playlist.playlistdata.items[index]);
}
exports.default = get;
;
function run(args) {
    return new Promise((resolve, reject) => {
        const process = (0, child_process_1.spawn)('python', [__dirname + '/index.py', ...args.map(a => a.toString())]);
        let errors = [];
        process.stdout.on('data', resolve);
        process.stderr.on('data', errors.push);
        process.on('exit', (code, _) => {
            if (code === 0)
                return;
            console.error(errors.join('\n'));
            reject();
        });
    });
}
function saveAllPlaylists() {
    playlist_1.Playlist.getAllPlaylists().then(pls => Promise.all(pls.map(genCsv))).catch(console.error);
}
exports.saveAllPlaylists = saveAllPlaylists;
let csvCache = null;
function getAllCsvs() {
    if (csvCache === null)
        csvCache = fetchAllCsvs();
    return csvCache;
}
exports.getAllCsvs = getAllCsvs;
function fetchAllCsvs() {
    if (!fs_1.default.existsSync("./resources/csv/"))
        return [];
    const dirent = fs_1.default.readdirSync("./resources/csv/", { withFileTypes: true, encoding: 'utf-8' });
    return dirent.filter(ent => ent.isFile()).map(ent => ent.name.replace(/\D/g, ""));
}
function getCsv(guildid) {
    const filepath = "./resources/csv/" + guildid + ".csv";
    if (!fs_1.default.existsSync(filepath))
        return null;
    return fs_1.default.readFileSync(filepath);
}
exports.getCsv = getCsv;
function genCsv(json) {
    function hash(str) {
        let hash = 0, i, chr;
        if (str.length === 0)
            return hash;
        for (i = 0; i < str.length; i++) {
            chr = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0;
        }
        return hash;
    }
    return fs_1.default.promises.writeFile("./resources/csv/" + json.guildid + ".csv", "Song ID, Song Length, Song Score, Song Genre, Artist Hash, Title Hash\n" +
        json.items.map((rs) => [rs.id, rs.length, rs.score, util_2.genreIds[rs.genre], hash(rs.artist), hash(rs.title),].join(",")).join("\n"), { flag: "w", encoding: 'utf-8' });
}
