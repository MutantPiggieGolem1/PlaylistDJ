import { BaseCommandInteraction, Client, Message } from "discord.js";
import { reply } from "../util";
import { Command } from "./Command";

export const Download: Command = {
    name: "download",
    description: "Downloads your playlist from youtube.",
    type: "CHAT_INPUT",

    run: async (ctx: BaseCommandInteraction | Message) => {
        await ctx.channel?.sendTyping()
        reply(ctx,"Downloading Music...");
    }
};