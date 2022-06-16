import { BaseCommandInteraction, Message, User } from "discord.js";
import { WHITELIST } from "../../index";
import { reply } from "../util";
import { Command } from "./Commands";

export const Auth: Command = {
    name: "auth",
    description: "Authorize another user to use the bot.",
    type: "CHAT_INPUT",
    options: [{
        name: "user",
        description: "User to authorize",
        type: 6, // user
        required: true,
    }],

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        let user: User | undefined;
        if (ctx instanceof BaseCommandInteraction) {
            user = ctx.options.get("user",true).user;
        } else if (ctx instanceof Message) {
            let u = ctx.content.replaceAll(/\s{2,}/g," ").split(" ")[2]
            user = ctx.guild.members.resolve(u.replaceAll(/\D/g,""))?.user ??
                ctx.guild.members.cache.find(m=>m.displayName===u)?.user
        }
        if (!user) return reply(ctx, "Couldn't find user.")

        WHITELIST.add(user.id)
        reply(ctx, `Added ${user.discriminator} to the whitelist.`)
    }
}