import { spawn } from 'child_process'
import fs from "fs"
import { ERRORS, genreIds, RatedSong, Song, SongReference } from "../constants"
import { Playlist } from '../web/playlist'

export default function get(gid: string): Promise<SongReference | null> {
    const playlist: Playlist | null = Playlist.getPlaylist(gid)
    if (!playlist) throw new Error(ERRORS.NO_PLAYLIST)
    return run([0,playlist.getSongs.length-1]).then(raw=>playlist.getSongs[Number.parseInt(raw)]).then(Playlist.getSong);
};

function run(args: {toString:()=>string}[]): Promise<string> {
    return new Promise((resolve, reject) => {
        const process = spawn('python', [__dirname+'/index.py', ...args.map(a=>a.toString())]);
        let errors: string[] = []

        process.stdout.on('data', resolve)
        process.stderr.on('data', errors.push);

        process.on('exit', (code, _) => {
          if (code === 0) return;
          console.error(errors.join('\n'));
          reject();
        });
    })
}

export async function saveAllPlaylists() {
    await Playlist.save();
    await genCsv();
    
    const pls: Playlist[] = Object.values(Playlist.getPlaylist);
    await Promise.all(pls.map(pl=>pl.save()));
    await Promise.all(pls.map(genCsv));
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

function genCsv(playlist: Playlist | void): Promise<void> {
    if (playlist) {
        return fs.promises.writeFile("./resources/csv/"+playlist.gid+".csv", 
            "Song ID, Song Score, Song Tags...\n"+
            playlist.getSongs.map((rs: RatedSong) => [rs.id, rs.score, ...(rs.tags ?? [])].join(",")).join("\n"),
        {flag: "w", encoding: 'utf-8'});
    } else {
        return fs.promises.writeFile("./resources/csv/music.csv", 
            "Song ID, Genre ID, Artist, Title, Length (seconds)\n"+
            Object.values(Playlist.getSong()).map((sr: Song) => [sr.id, genreIds[sr.genre], sr.artist, sr.title, sr.length].join(",")).join("\n"),
        {flag: "w", encoding: 'utf-8'});
    }
}