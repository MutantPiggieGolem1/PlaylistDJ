import { ApplicationCommandType, BaseCommandInteraction, Client, Message } from "discord.js";
import { Command } from "./Command";

export const Download: Command = {
    name: "download",
    description: "Downloads your playlist from youtube.",
    type: "CHAT_INPUT",

    run: async (client: Client, ctx: BaseCommandInteraction | string[], msg?: Message) => {
        if (ctx instanceof BaseCommandInteraction) { // slash command
            await ctx.reply({
                ephemeral: true,
                content: "Downloading music.."
            });
        } else if (ctx instanceof Array<string>) { // normal command
            await msg?.reply("Downloading music...")
        }
    }
};