"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Playing = void 0;
const index_1 = require("../../index");
const util_1 = require("../util");
const play_1 = require("./play");
exports.Playing = {
    name: "playing",
    description: "Prints the currently playing song",
    defaultMemberPermissions: "Speak",
    public: true,
    run: async (ctx) => {
        if (!ctx.guild)
            return;
        let song = (0, util_1.getPlaying)((0, util_1.getPlayer)(ctx.guild.id, false));
        if (!song)
            return (0, util_1.error)(ctx, util_1.ERRORS.NO_SONG);
        (0, util_1.reply)(ctx, { embeds: [{
                    type: "rich",
                    title: "Now Playing:",
                    description: `${song.title} - ${song.artist}\n\`${song.id}\``,
                    color: 0xff0000,
                    fields: [{
                            "name": "History:",
                            "value": play_1.history[ctx.guild.id]?.length > 1 ? play_1.history[ctx.guild.id].slice(1, 11).map(id => `\`${id}\``).join(", ") + (play_1.history[ctx.guild.id].length > 11 ? ", ..." : "") : "None"
                        }],
                    footer: {
                        text: `PlaylistDJ - Playing Music`,
                        icon_url: index_1.client.user?.avatarURL() ?? ""
                    }
                }] });
    }
};
