import { CommandInteraction, Message, Embed, MessageOptions } from "discord.js";
import format from "format-duration"
import { client } from "../../index";
import { Song } from "../../youtube/util";
import { error, ERRORS, getPlayer, getPlaying, reply } from "../util";
import { Command } from "./Commands";
import { timeouts } from "./play";

export const Playing: Command = {
    name: "playing",
    description: "Prints the currently playing song",
    defaultMemberPermissions: "Speak",
    public: true,

    run: async (ctx: CommandInteraction | Message) => {
        if (!ctx.guild) return;
        let song: Song | undefined = getPlaying(getPlayer(ctx.guild.id,false))
        if (!song) return error(ctx,ERRORS.NO_SONG);
        const to: number | undefined = timeouts[ctx.guild.id];
        reply(ctx, {embeds:[{
            type: "rich",
            title: "Now Playing:",
            description: `${song.title} - ${song.artist}\n\`${song.id}\``,
            color: 0xff0000,
            footer: {
                text: `PlaylistDJ - Playing Music - ${to > 0 ? (to >= Date.now() ? format(to-Date.now())+" left" : "Last Song") : "No Timeout"}`,
                icon_url: client.user?.avatarURL() ?? ""
            }
        } as Partial<Embed>]} as MessageOptions)
    }
}