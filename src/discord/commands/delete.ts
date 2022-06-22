import { BaseCommandInteraction, Message } from "discord.js";
import { RealSong } from "../../youtube/util";
import { getPlaylist, Playlist } from "../../youtube/playlist";
import { reply, truncateString } from "../util";
import { Command } from "./Commands";

export const Delete: Command = {
    name: "delete",
    description: "Deletes music from your playlist.",
    type: "CHAT_INPUT",
    public: false,
    options: [{
        name: "id",
        description: "Song ID(s) to remove",
        type: 3, // string
        required: true,
    }],

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        let inp: string | undefined = ctx instanceof BaseCommandInteraction
            ? ctx.options.get("id",true).value?.toString()
            : ctx.content.split(/\s+/g)[2]
        if (!inp) return reply(ctx, "Invalid Arguments!")

        let ids: string[] = inp.split(",").slice(undefined,10).map(id=>id.trim())
        try {
            var playlist: Playlist = getPlaylist(ctx.guild.id);
        } catch { return reply(ctx, "Couldn't find playlist!") }
        let songs: RealSong[] = playlist.removeSongs(ids);
        if (songs.length <= 0) return reply(ctx, "Couldn't find songs!");
        await playlist.save();
        reply(ctx,`Success! Removed ${songs.length} song${songs.length===1?"":"s"}:\n ${songs.map(i=>truncateString(i.title,12)).join(", ")}`)
    }
}