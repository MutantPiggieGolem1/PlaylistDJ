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
    Minecraft = 'Minecraft',
    Electronic = 'Electronic',
    Instrumental = 'Instrumental',
    Piano = 'Piano',
    Guitar = 'Guitar',
    Korean = 'Korean',
    Japanese = 'Japanese',
    Chinese = 'Chinese',
    Eurobeat = 'Eurobeat'
} // Philter, TheFatRat

export const genreIds: {[key in Genre as string]: number} = {
    "Unknown": 0,
    "Pop": 1,
    "Meme": 2,
    "Minecraft": 3,
    "Electronic": 4,

    "Korean": 6,
    "Japanese": 7,
    "Eurobeat": 8,

    "Instrumental": 100,
    "Piano": 101,
    "Guitar": 102,
};
