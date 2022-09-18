"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KickMe = void 0;
const voice_1 = require("@discordjs/voice");
const discord_js_1 = require("discord.js");
const util_1 = require("../util");
exports.KickMe = {
    name: "kickme",
    description: "Kicks you from the vc after some time.",
    options: [{
            name: "timeout",
            description: "How long until kick (minutes)",
            type: discord_js_1.ApplicationCommandOptionType.Number,
            required: true
        }],
    public: true,
    run: async (ctx) => {
        if (!ctx.guild || !ctx.member)
            return;
        const guild = ctx.guild;
        const member = ctx.member;
        let arg1 = ctx instanceof discord_js_1.CommandInteraction ?
            ctx.options.get("timeout", true).value?.toString().trim() :
            ctx.content.split(/\s+/g)[2].trim();
        if (!arg1 || Number.isNaN(arg1))
            return (0, util_1.error)(ctx, util_1.ERRORS.INVALID_ARGUMENTS);
        const channel = member.voice.channel;
        if (!channel)
            return (0, util_1.error)(ctx, new Error("You aren't in a voice channel!"));
        if (channel !== guild.members.me?.voice.channel)
            return (0, util_1.error)(ctx, new Error("You aren't in the same channel!"));
        const mystate = (0, util_1.getPlayer)(guild.id, false)?.state;
        if (!mystate || mystate.status !== voice_1.AudioPlayerStatus.Playing)
            return (0, util_1.error)(ctx, new Error("No music is currently being played!"));
        let timeout = Math.abs(Number.parseInt(arg1));
        (0, util_1.reply)(ctx, `Auto-Kicking you in ${arg1} minute${timeout !== 1 ? "s" : ""}!`);
        setTimeout(() => {
            const channel = member.voice.channel;
            if (!channel || channel !== guild.members.me?.voice.channel)
                return;
            member.voice.disconnect("Auto-Kick after " + timeout + "m").catch(console.error);
        }, timeout * 60 * 1000);
    }
};
