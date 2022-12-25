import { ApplicationCommandOptionType, CommandInteraction, User, EmbedType, ApplicationCommandType } from "discord.js";
import { WHITELIST, client } from "../../index";
import { ERRORS } from "../../constants";
import { Command } from "./Commands";

export const Auth: Command = {
    name: "auth",
    description: "Modifies users with administrator privileges.",
    type: ApplicationCommandType.ChatInput,
    public: false,
    options: [
        {
            "type": ApplicationCommandOptionType.Subcommand,
            "name": "add",
            "description": "Authorizes a user",
            "options": [
                {
                    "type": ApplicationCommandOptionType.User,
                    "name": "user",
                    "description": "User to authorize",
                    "required": true
                }
            ]
        },
        {
            "type": ApplicationCommandOptionType.Subcommand,
            "name": "remove",
            "description": "Deauthorizes a user",
            "options": [{
                "type": ApplicationCommandOptionType.User,
                "name": "user",
                "description": "User to deauthorize",
                "required": true,
            }],
        },
        {
            "type": ApplicationCommandOptionType.Subcommand,
            "name": "list",
            "description": "List authorized users"
        }
    ],

    run: (ctx: CommandInteraction) => {
        if (!ctx.guild) return Promise.reject(ERRORS.NO_GUILD);
        if (ctx.member?.user.id !== "547624574070816799") return ctx.reply({content:ERRORS.NO_PERMS,ephemeral:true})
        const user: User | undefined = ctx.options.get("user", false)?.user
        const option = ctx.options.data[0]?.options ? ctx.options.data[0]?.options[0].name : ""
        switch (option) {
            case 'add':
                if (!user) return ctx.reply({content: ERRORS.NO_USER, ephemeral: true});
                if (!WHITELIST.has(user.id)) {
                    WHITELIST.add(user.id)
                    return ctx.reply({content:`Added ${user.tag} to the whitelist.`,ephemeral:true});
                } else {
                    return ctx.reply({content:`${user.tag} was already on the whitelist.`,ephemeral:true});
                }
            case 'remove':
                if (!user) return ctx.reply({content: ERRORS.NO_USER, ephemeral: true});
                if (WHITELIST.has(user.id)) {
                    WHITELIST.delete(user.id)
                    return ctx.reply({content:`Removed ${user.tag} from the whitelist.`,ephemeral:true});
                } else {
                    return ctx.reply({content:`${user.tag} wasn't on the whitelist.`,ephemeral:true});
                }
            case 'list':
                return ctx.reply({
                    "content": `_`,
                    "embeds": [{
                        "type": EmbedType.Rich,
                        "title": `Bot Administrators`,
                        "description": "",
                        "color": 0x123456,
                        "fields": [...WHITELIST.keys()].map(id => {return {
                            "name": client.users.resolve(id)?.tag ?? id,
                            "value": id
                        }}),
                        "footer": {
                            "text": "PlaylistDJ - Auth List",
                            "icon_url": client.user?.avatarURL() ?? ""
                        }
                    }]
                })
            default:
                return ctx.reply({content: ERRORS.INVALID_ARGUMENTS, ephemeral: true});
        }
    }
}