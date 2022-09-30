export enum ERRORS {
    INVALID_ARGUMENTS = 'Invalid Arguments!',
    TIMEOUT = "Interaction Timed Out!",
    NO_PERMS = "Insufficent Permissions!",
    NO_CONNECTION = 'Couldn\'t find voice connection!',
    NO_USER = 'Couldn\'t find user!',
    NO_PLAYLIST = 'Couldn\'t find playlist!',
    NO_SONG = 'Couldn\'t find song!',
    NO_GUILD = 'Couldn\'t find guild!',
}

export type RatedSong = { id: string; tags?: string[]; score: number; };
export type SongReference = Song & { file: string; url: string; };
export type Song = {
    id: string;

    title: string;
    artist: string;
    genre: Genre;
    length: number; // Song Duration (Seconds)
};

export enum Genre {
    Unknown = 'Unknown',
    Pop = 'Pop',
    Meme = 'Meme',

    Instrumental = 'Instrumental',
    Piano = 'Piano',
    Guitar = 'Guitar',

    Foriegn = 'Foriegn Language',
    Chinese = 'Chinese',
    Japanese = 'Japanese',
    Korean = 'Korean',
    
    Electronic = 'Electronic',
    Dubstep = 'Dubstep',
    Electro = 'Electro',

    Minecraft = 'Minecraft',
} // Philter, TheFatRat

export const genreIds: {[key in Genre]: number} = {
    "Unknown": 0,
    // Normal Genres
    "Pop": 1,
    "Meme": 2,
    // Instruments
    "Instrumental": 100,
    "Piano": 101,
    "Guitar": 102,
    // Languages
    "Foriegn Language": 200,
    "Chinese": 201,
    "Japanese": 202,
    "Korean": 203,
    // Electronic
    "Electronic": 300,
    "Dubstep": 301,
    "Electro": 302,
    // Misc.
    "Minecraft": 1001,
};
