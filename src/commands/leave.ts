import { BaseCommandInteraction, Message } from "discord.js";
import { reply } from "../util";
import { Command } from "./Command";

export const Leave: Command = {
    name: "leave",
    description: "Leaves the voice channel and stops playing",
    type: "CHAT_INPUT",

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild?.available) return;
        let success: boolean | undefined = await ctx.guild.me?.voice.disconnect().then(() => Promise.resolve(true)).catch(() => Promise.resolve(false))
        reply(ctx,success ? "Left voice channel!" : "Failed to leave voice channel.");
    }
};