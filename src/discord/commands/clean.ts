import { BaseCommandInteraction, Message } from "discord.js";
import { Command } from "./Commands";
import { Playlist } from "../../youtube/playlist";
import { editReply, reply } from "../util";

export const Clean: Command = {
    name: "clean",
    description: "Deletes unreferenced files globally.",
    type: "CHAT_INPUT",
    public: false,
    options: [],

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        Playlist.clean().once('start', () => {
            reply(ctx, "Began clean operation!")
        }).on('progress', (message: string) => {
            editReply(ctx, message)
        }).on('finish', (remainder: string[]) => {
            editReply(ctx, `Clean Complete! Deleted ${remainder.length} files!`)
        }).on('error', (e: Error) => {
            editReply(ctx, `Error: ${e.message}`)
        })
    }
}