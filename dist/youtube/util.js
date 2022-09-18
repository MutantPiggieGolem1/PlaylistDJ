"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.genreIds = exports.Genre = exports.parseVideo = exports.AUDIOFORMAT = void 0;
exports.AUDIOFORMAT = ".webm";
function parseVideo(video, videoinfo) {
    let titlesegments = video.title.split(" - ").slice(0, 2);
    let artistindex = titlesegments.findIndex(segment => segment.includes(video.author.name) || video.author.name.toLowerCase().includes(segment.replaceAll(/\s/g, "").toLowerCase()));
    return {
        id: video.id,
        title: artistindex >= 0 ? titlesegments[(artistindex + 1) % 2]?.replace(/[([].*?Official.*?[\])]/i, "")?.trim() : video.title,
        artist: titlesegments.length === 2 && artistindex >= 0 ? titlesegments[artistindex] : video.author.name,
        genre: Genre.Unknown,
        length: video.durationSec ?? -1,
    };
}
exports.parseVideo = parseVideo;
var Genre;
(function (Genre) {
    Genre["Unknown"] = "Unknown";
    Genre["Pop"] = "Pop";
    Genre["Meme"] = "Meme";
    Genre["Minecraft"] = "Minecraft";
    Genre["Electronic"] = "Electronic";
    Genre["Instrumental"] = "Instrumental";
    Genre["Piano"] = "Piano";
    Genre["Guitar"] = "Guitar";
    Genre["Korean"] = "Korean";
    Genre["Japanese"] = "Japanese";
    Genre["Chinese"] = "Chinese";
    Genre["Eurobeat"] = "Eurobeat";
})(Genre = exports.Genre || (exports.Genre = {}));
exports.genreIds = {
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
