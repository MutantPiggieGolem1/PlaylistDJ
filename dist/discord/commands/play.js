"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Play = exports.history = void 0;
const tslib_1 = require("tslib");
const voice_1 = require("@discordjs/voice");
const discord_js_1 = require("discord.js");
const fs_1 = require("fs");
const interface_1 = tslib_1.__importDefault(require("../../recommendation/interface"));
const playlist_1 = require("../../youtube/playlist");
const util_1 = require("../util");
const vote_1 = require("./vote");
exports.history = {};
exports.Play = {
    name: "play",
    description: "Begins playing music.",
    options: [{
            name: "id",
            description: "Song ID to start with",
            type: discord_js_1.ApplicationCommandOptionType.String,
            required: false,
            autocomplete: true,
        }],
    defaultMemberPermissions: "Speak",
    public: true,
    run: async (ctx) => {
        if (!ctx.guild)
            return;
        const guildid = ctx.guild.id;
        let pl = (0, playlist_1.getPlaylist)(ctx.guild.id);
        if (!pl)
            return (0, util_1.error)(ctx, util_1.ERRORS.NO_PLAYLIST);
        let playlist = pl.playlistdata;
        if (!playlist.items)
            return (0, util_1.error)(ctx, util_1.ERRORS.NO_SONG);
        let arg1 = ctx instanceof discord_js_1.CommandInteraction ?
            ctx.options.get("id", false)?.value?.toString() :
            ctx.content.split(/\s+/g)[2];
        let start = playlist.items.find(s => s.id === arg1);
        if (!start) {
            if (arg1)
                await (0, util_1.error)(ctx, util_1.ERRORS.NO_SONG);
            start = await (0, interface_1.default)(ctx.guild.id);
        }
        let player = (0, util_1.getPlayer)(ctx.guild.id);
        player.removeAllListeners().stop();
        let connection = (0, voice_1.getVoiceConnection)(ctx.guild.id);
        if (!connection?.subscribe(player))
            return (0, util_1.error)(ctx, util_1.ERRORS.NO_CONNECTION);
        if (ctx instanceof discord_js_1.CommandInteraction && !ctx.deferred && !ctx.replied)
            ctx.reply({ content: "Began Playing!", ephemeral: true });
        play(player, start);
        exports.history[guildid] = [start.id];
        player.on(voice_1.AudioPlayerStatus.Idle, async () => {
            play(player, await (0, interface_1.default)(guildid), guildid);
            (0, vote_1.resetVotes)(guildid);
        }).on("error", (e) => {
            console.error(`Audio Player Error: ${e.message}\n  Resource: [${e.resource.metadata ? JSON.stringify(e.resource.metadata) : JSON.stringify(e.resource)}]`);
        });
    },
    ac(ctx) {
        if (!ctx.guild)
            return new Error(util_1.ERRORS.NO_GUILD);
        const playlist = (0, playlist_1.getPlaylist)(ctx.guild.id);
        if (!playlist?.playlistdata.items || playlist.playlistdata.items.length <= 0)
            return new Error(util_1.ERRORS.NO_PLAYLIST);
        const focused = ctx.options.getFocused().toString();
        if (focused.length <= 0)
            return [];
        return Object.values(playlist.playlistdata.items)
            .filter(k => k.id.startsWith(focused) || k.title.toLowerCase().startsWith(focused.toLowerCase()))
            .map(o => {
            return { name: o.title, value: o.id };
        });
    }
};
function play(player, song, guildid) {
    if (guildid && exports.history[guildid])
        exports.history[guildid].unshift(song.id);
    player.play((0, voice_1.createAudioResource)((0, fs_1.createReadStream)(song.file), { inlineVolume: false, inputType: voice_1.StreamType.WebmOpus, metadata: song }));
}
