"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Vote = exports.resetVotes = void 0;
const discord_js_1 = require("discord.js");
const playlist_1 = require("../../youtube/playlist");
const util_1 = require("../util");
const voted = {};
function resetVotes(gid) { voted[gid]?.clear(); }
exports.resetVotes = resetVotes;
exports.Vote = {
    name: "vote",
    description: "Casts a vote on the current song.",
    options: [{
            name: "vote",
            description: "Upvote or downvote?",
            type: discord_js_1.ApplicationCommandOptionType.String,
            required: true,
            choices: [
                { name: "Up", value: "up" },
                { name: "Down", value: "down" }
            ]
        }],
    defaultMemberPermissions: "PrioritySpeaker",
    public: true,
    run: async (ctx) => {
        if (!ctx.guild || !(ctx.member instanceof discord_js_1.GuildMember))
            return;
        if (voted[ctx.guild.id]?.has(ctx.member.user.id))
            return (0, util_1.error)(ctx, new Error("You've already voted!"));
        let arg1 = (ctx instanceof discord_js_1.CommandInteraction ?
            ctx.options.get("vote", true).value?.toString() :
            ctx.content.split(/\s+/g)[2])?.toLowerCase();
        if (!arg1 || !["up", "down"].includes(arg1))
            return (0, util_1.error)(ctx, util_1.ERRORS.INVALID_ARGUMENTS);
        const me = await ctx.guild.members.fetchMe();
        if (!ctx.member.voice || ctx.member.voice.channelId !== me.voice.channelId || ctx.member.voice.deaf || me.voice.serverMute)
            return (0, util_1.error)(ctx, new Error("You aren't even listening to the music!"));
        let playlist = (0, playlist_1.getPlaylist)(ctx.guild.id);
        if (!playlist)
            return (0, util_1.error)(ctx, util_1.ERRORS.NO_PLAYLIST);
        let song = (0, util_1.getPlaying)((0, util_1.getPlayer)(ctx.guild.id, false));
        if (!song)
            return (0, util_1.error)(ctx, util_1.ERRORS.NO_SONG);
        if (!voted[ctx.guild.id])
            voted[ctx.guild.id] = new Set();
        voted[ctx.guild.id].add(ctx.member.user.id);
        playlist.vote(song.id, arg1 === "up");
        (0, util_1.reply)(ctx, `${arg1[0].toUpperCase() + arg1.slice(1)}voted '${(0, util_1.truncateString)(song.title, 17)}' [\`${song.id}\`] (${playlist.playlistdata.items.find(i => i.id === song?.id)?.score} score)`);
    }
};
