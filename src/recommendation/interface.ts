import { spawn } from 'child_process'
import fs from "fs"
import { ERRORS } from '../discord/util'
import { getPlaylist, Playlist } from '../youtube/playlist'
import { genreIds, MusicJSON, RatedSong, SongReference } from '../youtube/util'

export default function get(gid: string): Promise<SongReference> {
    const playlist: Playlist | undefined = getPlaylist(gid)
    if (!playlist) throw new Error(ERRORS.NO_PLAYLIST)
    return run([0,playlist.playlistdata.items.length-1]).then(raw=>Number.parseInt(raw)).then(index=>playlist.playlistdata.items[index])
};

function run(args: {toString:()=>string}[]): Promise<string> {
    return new Promise((resolve, reject) => {
        const process = spawn('python', [__dirname+'/index.py', ...args.map(a=>a.toString())]);
        let errors: string[] = []

        process.stdout.on('data', resolve)
        process.stderr.on('data',errors.push);

        process.on('exit', (code, _) => {
          if (code === 0) return;
          console.error(errors.join('\n'));
          reject();
        });
    })
}

export function saveAllPlaylists() {
    Playlist.getAllPlaylists().then(pls => Promise.all(pls.map(genCsv))).catch(console.error)
}

let csvCache: string[] | null = null;
export function getAllCsvs(): string[] | undefined {
    if (csvCache === null) csvCache = fetchAllCsvs();
    return csvCache;
}
function fetchAllCsvs(): string[] {
    if (!fs.existsSync("./resources/csv/")) return [];
    const dirent: fs.Dirent[] = fs.readdirSync("./resources/csv/", {withFileTypes: true, encoding: 'utf-8'})
    return dirent.filter(ent=>ent.isFile()).map(ent => ent.name.replace(/\D/g, ""))
}
export function getCsv(guildid: string): Buffer | null {
    const filepath: string = "./resources/csv/"+guildid+".csv";
    if (!fs.existsSync(filepath)) return null;
    return fs.readFileSync(filepath);
}

function genCsv(json: MusicJSON): Promise<void> {
    function hash(str: string): number {
        let hash = 0, i, chr;
        if (str.length === 0) return hash;
        for (i = 0; i < str.length; i++) {
            chr   = str.charCodeAt(i);
            hash  = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }

    return fs.promises.writeFile("./resources/csv/"+json.guildid+".csv", 
        "Song ID, Song Length, Song Score, Song Genre, Artist Hash, Title Hash\n"+
            json.items.map((rs: RatedSong) => [rs.id, rs.length, rs.score, genreIds[rs.genre], hash(rs.artist), hash(rs.title), ].join(",")).join("\n"),
        {flag: "w", encoding: 'utf-8'}
    )
}