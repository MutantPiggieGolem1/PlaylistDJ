import { BaseCommandInteraction, Message } from "discord.js";
import { Playlist } from "../../youtube/playlist";
import { reply } from "../util";
import { Command } from "./Commands";

export const Delete: Command = {
    name: "delete",
    description: "Deletes music from the filesystem.",
    type: "CHAT_INPUT",
    public: false,
    options: [{
        name: "id",
        description: "Song ID(s) to delete",
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
        if (ids.length <= 0) return reply(ctx, "Invalid Arguments!")
        await Playlist.delete(ids);
        reply(ctx,`Success! Deleted ${ids.length} song(s).`)
    }
}