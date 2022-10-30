import { spawn } from 'child_process'
import fs from "fs"
import { ERRORS, genreIds, RatedSong, Song, SongReference } from "../constants"
import { Playlist } from '../web/playlist'

export default function get(gid: string): Promise<SongReference | null> {
    const playlist: Playlist | null = Playlist.getPlaylist(gid)
    if (!playlist) return Promise.reject(ERRORS.NO_PLAYLIST);
    return run([0,playlist.getSongs.length-1])
        .then(raw=>playlist.getSongs[Number.parseInt(raw)])
        .then(Playlist.getSong);
};

function run(args: {toString:()=>string}[]): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const process = spawn('python', [__dirname+'/index.py', ...args.map(a=>a.toString())]);
        let errors: string[] = []

        process.stdout.on('data', resolve)
        process.stderr.on('data', errors.push);

        process.on('exit', (code, _) => {
          if (code === 0) return;
          console.warn(errors.join('\n'));
          reject(errors.join('\n'));
        });
    }).catch(e=>{
        console.error(e);
        return Promise.reject();
    });
}

export async function saveAllPlaylists() {
    csvCache = null;
    await Playlist.save();
    await genCsv();
    
    const pls: Playlist[] = Object.values(Playlist.getPlaylist);
    await Promise.all(pls.map(pl=>pl.save()));
    await Promise.all(pls.map(pl=>genCsv(pl))); // verbosity
}

let csvCache: string[] | null = null;
export function getAllCsvs(): string[] {
    if (csvCache === null) csvCache = fetchAllCsvs();
    return csvCache;
}
function fetchAllCsvs(): string[] {
    if (!fs.existsSync("./resources/csv/")) return [];
    const dirent: fs.Dirent[] = fs.readdirSync("./resources/csv/", {withFileTypes: true, encoding: 'utf-8'})
    return dirent.filter(ent=>ent.isFile()).map(ent => ent.name.replace(/\D/g, "")).filter(id=>id!=="0") // exclude index
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
            playlist.getSongs.map((rs: RatedSong) => [rs.id, rs.score, ...(rs.tags ?? [])].join(",")).join("\n"));
    }
    return fs.promises.writeFile("./resources/csv/0.csv", 
        "Song ID, Genre ID, Artist, Title, Length (seconds)\n"+Object.values(Playlist.getSong()).map((sr: Song) => 
            [sr.id, genreIds[sr.genre], sr.artist.replaceAll(",", "\\,"), sr.title.replace(",", "\\,"), sr.length].join(",")
        ).join("\n")
    );
}