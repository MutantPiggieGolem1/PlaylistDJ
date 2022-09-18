"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leave = exports.Leave = void 0;
const voice_1 = require("@discordjs/voice");
const discord_js_1 = require("discord.js");
const util_1 = require("../util");
exports.Leave = {
    name: "leave",
    description: "Leaves the voice channel and stops playing",
    defaultMemberPermissions: "ManageChannels",
    public: true,
    run: async (ctx) => {
        if (!ctx.guild)
            return;
        let voicechannel = (ctx.guild.members.me ?? await ctx.guild.members.fetchMe()).voice.channel;
        if (!voicechannel)
            return (0, util_1.error)(ctx, util_1.ERRORS.NO_CONNECTION);
        try {
            leave(ctx);
            if (ctx instanceof discord_js_1.CommandInteraction)
                ctx.reply({ content: "Left " + voicechannel.toString(), ephemeral: true });
        }
        catch (e) {
            (0, util_1.error)(ctx, e);
        }
    }
};
function leave(ctx) {
    if (!ctx.guild)
        return;
    let player = (0, util_1.getPlayer)(ctx.guild.id, false);
    player?.removeAllListeners().stop();
    let voiceconnection = (0, voice_1.getVoiceConnection)(ctx.guild.id);
    if (!voiceconnection?.disconnect())
        throw new Error("Failed to leave voice channel.");
}
exports.leave = leave;
