import { BaseCommandInteraction, Message, MessageActionRow, MessageActionRowComponent, MessageComponentInteraction, MessageSelectOptionData } from "discord.js";
import fs from "fs";
import { getPlaylistFiles, MusicJSON, reply, setPlaylistFiles } from "../util";
import { Command } from "./Commands";

let idata: {[key: string]: {index: number, exclusions: Array<number>}} = {}

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
        
        let playlistdata: MusicJSON = getPlaylistFiles(ctx.guild.id)[0];
        if (Object.keys(playlistdata).includes(id)) delete playlistdata[id];
        await setPlaylistFiles(ctx.guild.id,playlistdata);
        fs.rm(dir+id+".ogg", () => {reply(ctx, "File Deleted!");})
    }
};