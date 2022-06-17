import { BaseCommandInteraction, Message, User } from "discord.js";
import { WHITELIST } from "../../index";
import { reply } from "../util";
import { Command } from "./Commands";

export const Auth: Command = {
    name: "auth",
    description: "Authorize a user",
    type: "CHAT_INPUT",
    public: false,
    options: [
        {
            "type": 1,
            "name": "add",
            "description": "Authorizes a user",
            "options": [
                {
                    "type": 6,
                    "name": "user",
                    "description": "User to authorize",
                    "required": true
                }
            ]
        },
        {
            "type": 1,
            "name": "remove",
            "description": "Deauthorizes a user",
            "options": [
                {
                    "type": 6,
                    "name": "user",
                    "description": "User to deauthorize",
                    "required": true
                }
            ]
        }
    ],

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        let user: User | undefined, option: string;
        if (ctx instanceof BaseCommandInteraction) {
            option = ctx.options.data[0].name
            user = ctx.options.get("user", true).user;
        } else {
            let u: string;
            [option,u] = ctx.content.replaceAll(/\s{2,}/g," ").split(" ").slice(2)
            user = ctx.guild.members.resolve(u.replaceAll(/\D/g, ""))?.user ??
                ctx.guild.members.cache.find(m => m.displayName === u)?.user
        }
        if (!user) return reply(ctx, "Couldn't find user.");

        switch (option) {
            case 'add':
                WHITELIST.add(user.id)
                reply(ctx, `Added ${user.tag} to the whitelist.`)
                break;
            case 'remove':
                WHITELIST.delete(user.id)
                reply(ctx, `Removed ${user.tag} from the whitelist.`)
                break;
            default:
                reply(ctx, "Invalid arguments!");
                break;
        }
    }
}

