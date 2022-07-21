import { spawn } from 'child_process';
import { ERRORS } from '../discord/util';
import { getPlaylist, Playlist } from '../youtube/playlist';
import { genreIds, MusicJSON, RatedSong, SongReference } from '../youtube/util';

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
          if (code !== 0) return reject(new Error(errors.join('\n')))
        });
    })
}

function toCsv(json: MusicJSON): string {
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

    // sid, length, score, genre id, artist hash, title hash, <tag hash>
    return json.items.map((rs: RatedSong) => [rs.id, rs.length, rs.score, genreIds[rs.genre], hash(rs.artist), hash(rs.title), ].join(",")).join("\n");
}