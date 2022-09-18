"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Commands = void 0;
const admin_1 = require("./admin");
const join_1 = require("./join");
const kickme_1 = require("./kickme");
const leave_1 = require("./leave");
const play_1 = require("./play");
const playing_1 = require("./playing");
const playlist_1 = require("./playlist");
const rickroll_1 = require("./rickroll");
const vote_1 = require("./vote");
exports.Commands = [
    admin_1.Admin, playlist_1.Playlist,
    join_1.Join, leave_1.Leave, play_1.Play, playing_1.Playing, kickme_1.KickMe, vote_1.Vote,
    rickroll_1.Rickroll,
];
