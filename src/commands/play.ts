import { BaseCommandInteraction, Message } from "discord.js";
import { Command } from "./Command";

export const Play: Command = {
    name: "play",
    description: "Begin playing music",
    type: "CHAT_INPUT",

    run: async (ctx: BaseCommandInteraction | Message) => {
        
    }
}