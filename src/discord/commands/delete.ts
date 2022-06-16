import { BaseCommandInteraction, Message } from "discord.js";
import fs from "fs";
import { Playlist } from "../../youtube/playlist";
import { reply } from "../util";
import { Command } from "./Commands";

export const Delete: Command = {
    name: "delete",
    description: "Deletes music from your playlist.",
    type: "CHAT_INPUT",
    options: [{
        name: "id",
        description: "Song ID to remove",
        type: 3, // string
        required: true,
    }],

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        const dir = `./resources/music/${ctx.guild?.id ?? "unknown"}/`;
        let id: string | undefined;
        if (ctx instanceof BaseCommandInteraction) {
            id = ctx.options.get("id",true).value?.toString()
        } else if (ctx instanceof Message) {
            id = ctx.content.replaceAll(/\s{2,}/g," ").split(" ")[2]
        }
        if (!id || !fs.existsSync(dir+id+".ogg")) return reply(ctx, "Invalid Filename!")
        let playlist: Playlist
        try {
            playlist = new Playlist(ctx.guild.id);
        } catch { return reply(ctx, "Couldn't find playlist!") }
        playlist.removeSong(id)
        playlist.saveTo(`./resources/music/${ctx.guild.id}/`)
    }
};