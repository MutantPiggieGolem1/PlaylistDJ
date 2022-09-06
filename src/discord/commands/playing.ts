import { CommandInteraction, Embed, Message, MessageOptions } from "discord.js"
import { client } from "../../index"
import { Song } from "../../youtube/util"
import { error, ERRORS, getPlayer, getPlaying, reply } from "../util"
import { Command } from "./Commands"
import { history } from "./play"

export const Playing: Command = {
    name: "playing",
    description: "Prints the currently playing song",
    defaultMemberPermissions: "Speak",
    public: true,

    run: async (ctx: CommandInteraction | Message) => {
        if (!ctx.guild) return;
        let song: Song | undefined = getPlaying(getPlayer(ctx.guild.id,false))
        if (!song) return error(ctx,ERRORS.NO_SONG);
        reply(ctx, {embeds:[{
            type: "rich",
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
        } as Partial<Embed>]} as MessageOptions)
    }
}