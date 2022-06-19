import { BaseCommandInteraction, Message, User, MessageOptions } from "discord.js"
import { client, WHITELIST } from "../../index"
import { reply } from "../util"
import { Command } from "./Commands"

export const Auth: Command = {
    name: "auth",
    description: "Modifies users with administrator privileges.",
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
        },
        {
            "type": 1,
            "name": "list",
            "description": "List authorized users"
        }
    ],

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return
        if ((ctx instanceof BaseCommandInteraction ? ctx.user : ctx.author).id !== "547624574070816799") return reply(ctx, "This command isnt for you loser")
        let user: User | undefined, option: string
        if (ctx instanceof BaseCommandInteraction) {
            option = ctx.options.data[0].name
            user = ctx.options.get("user", false)?.user
        } else {
            let u: string;
            [option, u] = ctx.content.replaceAll(/\s{2,}/g, " ").split(" ").slice(2)
            if (u) user = ctx.guild.members.resolve(u.replaceAll(/\D/g, ""))?.user ?? ctx.guild.members.cache.find(m => m.displayName === u)?.user
        }

        switch (option) {
            case 'add':
                if (!user) return reply(ctx, "Couldn't find user.")
                WHITELIST.add(user.id)
                reply(ctx, `Added ${user.tag} to the whitelist.`)
                break
            case 'remove':
                if (!user) return reply(ctx, "Couldn't find user.")
                WHITELIST.delete(user.id)
                reply(ctx, `Removed ${user.tag} from the whitelist.`)
                break
            case 'list':
                let msg: MessageOptions = {
                    "content": `_`,
                    "embeds": [
                        {
                            "type": "rich",
                            "title": `Bot Administrators`,
                            "description": "",
                            "color": 0x123456,
                            "fields": [...WHITELIST.keys()].map(id => {return {
                                "name": client.users.resolve(id)?.tag,
                                "value": id
                            }}),
                            "footer": {
                                "text": "PlaylistDJ - Auth List",
                                "iconURL": client.user?.avatarURL() ?? ""
                            }
                        }
                    ]
                } as MessageOptions
                reply(ctx, msg)
                break
            default:
                reply(ctx, "Invalid arguments!")
                break
        }
    }
}

