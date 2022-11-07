import { spawn } from 'child_process'
import fs from "fs"
import { ERRORS, genreIds, RatedSong, Song, SongReference } from "../constants"
import { Playlist } from '../web/playlist'

export default function get(gid: string): Promise<SongReference | null> {
    const playlist: Playlist | null = Playlist.getPlaylist(gid)
    if (!playlist) return Promise.reject(ERRORS.NO_PLAYLIST);
    return run([0,playlist.getSongs.length-1])
        .then(raw=>playlist.getSongs[Number.parseInt(raw)])
        .then(Playlist.getSong)
};

export async function getFileSizeMiB(path: string): Promise<number> {
    return fs.promises.stat(path).then(s=>s.size / (1024*1024));
}

function run(args: {toString:()=>string}[]): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const pyscript = spawn('python', [__dirname+'/index.py', ...args.map(a=>a.toString())]);
        let errors: string[] = []

        pyscript.stdout.on('data', resolve);
        
        pyscript.stderr.pipe(process.stderr)
        pyscript.stderr.on('data', errors.push);
        pyscript.on('error', errors.push);

        pyscript.on('exit', code => {
            if (code === 0) return;
            console.warn(errors.join('\n'));
            reject(errors.join('\n'));
        });
    });
}

export async function saveAllPlaylists() {
    csvCache = null;
    await Playlist.save();
    await genCsv();
    
    const pls: Playlist[] = Object.values(Playlist.getPlaylist());
    await Promise.all(pls.map(pl=>pl.save()));
    await Promise.all(pls.map(genCsv));
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
            playlist.getSongs.map((rs: RatedSong) => [rs.id, rs.score, rs.tags ? `"${rs.tags.join(",")}"` : "None"].join(",")).join("\n"));
    }
    return fs.promises.writeFile("./resources/csv/0.csv", 
        "Song ID, Genre ID, Artist, Title, Length (seconds)\n"+Object.values(Playlist.getSong()).map((sr: Song) => 
            [sr.id, genreIds[sr.genre], `"${sr.artist.replaceAll('"', '""')}"`, `"${sr.title.replaceAll('"', '""')}"`, sr.length].join(",")
        ).join("\n")
    );
}