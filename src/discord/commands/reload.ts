import { BaseCommandInteraction, Message } from "discord.js";
import { Playlist } from "../../youtube/playlist";
import { reply } from "../util";
import { Command } from "./Commands";

export const Reload: Command = {
    name: "reload",
    description: "Reload playlist metadata.",
    type: "CHAT_INPUT",

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        
        new Playlist(ctx.guild.id).reencode().then(() => {
            reply(ctx,"Finished reencoding your playlist!");
        }).catch(e => {
            reply(ctx,"An error occured: "+e.name)
        })
    }
}