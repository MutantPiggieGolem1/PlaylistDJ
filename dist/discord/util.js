"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWhitelisted = exports.truncateString = exports.editReply = exports.reply = exports.ERRORS = exports.error = exports.getPlaying = exports.getPlayer = exports.ITEMS_PER_PAGE = void 0;
const voice_1 = require("@discordjs/voice");
const discord_js_1 = require("discord.js");
const index_1 = require("../index");
exports.ITEMS_PER_PAGE = 25;
function getPlayer(guildid, create = true) {
    const a = (0, voice_1.getVoiceConnection)(guildid);
    if (!a || !("subscription" in a.state) || !a.state.subscription) {
        if (!create)
            return;
        return (0, voice_1.createAudioPlayer)({ behaviors: { noSubscriber: voice_1.NoSubscriberBehavior.Pause } }).setMaxListeners(1);
    }
    return a.state.subscription.player;
}
exports.getPlayer = getPlayer;
function getPlaying(player) {
    if (!player || !('resource' in player.state))
        return;
    const resource = player.state.resource;
    if (!resource?.metadata)
        return;
    return resource.metadata;
}
exports.getPlaying = getPlaying;
async function error(ctx, error) {
    return reply(ctx, error instanceof Error ? "Error: " + error.message : error, true);
}
exports.error = error;
var ERRORS;
(function (ERRORS) {
    ERRORS["INVALID_ARGUMENTS"] = "Invalid Arguments!";
    ERRORS["TIMEOUT"] = "Interaction Timed Out!";
    ERRORS["NO_PERMS"] = "Insufficent Permissions!";
    ERRORS["NO_CONNECTION"] = "Couldn't find voice connection!";
    ERRORS["NO_USER"] = "Couldn't find user!";
    ERRORS["NO_PLAYLIST"] = "Couldn't find playlist!";
    ERRORS["NO_SONG"] = "Couldn't find song!";
    ERRORS["NO_GUILD"] = "Couldn't find guild!";
})(ERRORS = exports.ERRORS || (exports.ERRORS = {}));
function reply(ctx, content, fetchReply = false) {
    if (typeof content === "string")
        content = { content };
    if (!('ephemeral' in content))
        content = { ...content, ephemeral: true };
    if (ctx instanceof discord_js_1.Message)
        return ctx.reply(content);
    if (ctx.deferred || ctx.replied)
        return editReply(ctx, content);
    return ctx.reply(content).then(async (_) => fetchReply ? await ctx.fetchReply() : _);
}
exports.reply = reply;
function editReply(ctx, content) {
    if (typeof content === "string")
        content = { content };
    if (ctx instanceof discord_js_1.Message) {
        let m = [...ctx.channel.messages.cache.values()].find(msg => msg.editable &&
            msg.reference?.messageId === ctx.id &&
            Date.now() - msg.createdAt.getTime() < 10 * 1000) ?? null;
        if (m) {
            return m.edit(content);
        }
        return ctx.reply(content);
    }
    if (ctx.replied || ctx.deferred)
        return ctx.editReply(content);
    return ctx.reply({ ...content, fetchReply: true });
}
exports.editReply = editReply;
function truncateString(str, len) {
    return (str.length > len) ? str.slice(0, len - 1) + ".." : str;
}
exports.truncateString = truncateString;
function isWhitelisted(ctx) {
    return (ctx instanceof discord_js_1.Message ? ctx.author : ctx.user).id === '547624574070816799' || index_1.WHITELIST.has((ctx instanceof discord_js_1.Message ? ctx.author : ctx.user).id);
}
exports.isWhitelisted = isWhitelisted;
