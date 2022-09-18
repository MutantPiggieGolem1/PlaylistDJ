"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rickroll = void 0;
const voice_1 = require("@discordjs/voice");
const discord_js_1 = require("discord.js");
const util_1 = require("../util");
const player = (0, voice_1.createAudioPlayer)({ behaviors: { noSubscriber: voice_1.NoSubscriberBehavior.Stop } });
exports.Rickroll = {
    name: "rr",
    description: "dQw4w9WgXcQ",
    defaultMemberPermissions: "Administrator",
    public: false,
    run: (ctx) => {
        if (!ctx.guild || ctx instanceof discord_js_1.Message)
            return;
        let conn = (0, voice_1.getVoiceConnection)(ctx.guild.id);
        if (!conn)
            return (0, util_1.error)(ctx, util_1.ERRORS.NO_CONNECTION);
        try {
            conn.removeAllListeners();
            player.play((0, voice_1.createAudioResource)("./resources/rr.webm", { inlineVolume: false, inputType: voice_1.StreamType.WebmOpus }));
            if (conn.subscribe(player))
                return ctx.reply({ content: "We participated in a miniscule amount of tomfoolery.", ephemeral: true });
        }
        catch (e) {
            console.warn(e);
        }
        ;
        ctx.reply({ content: "Mission Failed, we'll get 'em next time.", ephemeral: true });
    }
};
