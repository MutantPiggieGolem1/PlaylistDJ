import { BaseCommandInteraction, Message } from "discord.js";
import * as fs from "fs";
import { reply } from "../util";
import { Command } from "./Command";

export const Play: Command = {
    name: "play",
    description: "Begin playing music",
    type: "CHAT_INPUT",

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        const dir = `./resources/music/${ctx.guild.id}/`

        if (!fs.existsSync(dir)) return reply(ctx,"No music found.");
        if (!fs.existsSync(dir+"data.json")) {fs.writeFileSync(dir+"data.json","{}")}
        let data: MusicJSON = JSON.parse(fs.readFileSync(dir+"data.json").toString())
    }
}

type MusicJSON = {
    [key: string]: {
        file: string,
        artist: string,
        
    }
}