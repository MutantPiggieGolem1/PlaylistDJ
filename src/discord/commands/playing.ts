import { CommandInteraction, EmbedType, Message } from "discord.js"
import { ERRORS, Song } from "../../constants"
import { client } from "../../index"
import { error, getPlayer, getPlaying, reply } from "../util"
import { Command } from "./Commands"
import { history } from "./play"

export const Playing: Command = {
    name: "playing",
    description: "Prints the currently playing song",
    defaultMemberPermissions: "Speak",
    public: true,

    run: (ctx: CommandInteraction | Message) => {
        if (!ctx.guild) return Promise.reject(ERRORS.NO_GUILD);
        let song: Song | undefined = getPlaying(getPlayer(ctx.guild.id,false))
        if (!song) return error(ctx, ERRORS.NO_SONG);
        return reply(ctx, {embeds:[{
            type: EmbedType.Rich,
            title: "Now Playing:",
            description: `${song.title} - ${song.artist}\n\`${song.id}\``,
            color: 0xff0000,
            fields: [{
                "name": "History:",
                "value": history[ctx.guild.id]?.length > 1 ? history[ctx.guild.id].slice(1,11).map(id=>`\`${id}\``).join(", ")+(history[ctx.guild.id].length > 11 ? ", ..." : "") : "None"
            }],
            footer: {
                text: `PlaylistDJ - Playing Music`,
                icon_url: client.user?.avatarURL() ?? ""
            }
        }]});
    }
}