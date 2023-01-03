import { ApplicationCommandOptionType, CommandInteraction, User, EmbedType } from "discord.js";
import { WHITELIST, client, getArguments } from "../../index";
import { ERRORS } from "../../constants";
import { Command, SubCommand } from "./Commands";

const SubCommands: SubCommand[] = [{
    type: ApplicationCommandOptionType.Subcommand,
    name: "add",
    description: "Authorizes a user",
    options: [{
        "type": ApplicationCommandOptionType.User,
        "name": "user",
        "description": "User to authorize",
        "required": true
    }],
    public: false,

    run(ctx, {user}: {user: User}) {
        if (!WHITELIST.has(user.id)) {
            WHITELIST.add(user.id)
            return ctx.reply({content:`Added ${user.tag} to the whitelist.`,ephemeral:true});
        } else {
            return ctx.reply({content:`${user.tag} was already on the whitelist.`,ephemeral:true});
        }
    }
}, {
    type: ApplicationCommandOptionType.Subcommand,
    name: "remove",
    description: "Deauthorizes a user",
    options: [{
        "type": ApplicationCommandOptionType.User,
        "name": "user",
        "description": "User to deauthorize",
        "required": true,
    }],
    public: false,

    run(ctx, {user}: {user: User}) {
        if (WHITELIST.has(user.id)) {
            WHITELIST.delete(user.id)
            return ctx.reply({content:`Removed ${user.tag} from the whitelist.`,ephemeral:true});
        } else {
            return ctx.reply({content:`${user.tag} wasn't on the whitelist.`,ephemeral:true});
        }
    },
}, {
    type: ApplicationCommandOptionType.Subcommand,
    name: "list",
    description: "List authorized users",
    public: false,

    run: (ctx) => ctx.reply({
        content: `_`,
        ephemeral: true,
        embeds: [{
            "type": EmbedType.Rich,
            "title": `Bot Administrators`,
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
}]
export const Auth: Command = {
    name: "auth",
    description: "Modifies users with administrator privileges.",
    public: false,
    options: SubCommands,

    run: (ctx: CommandInteraction) => {
        if (!ctx.guild) return Promise.reject(ERRORS.NO_GUILD);
        if (ctx.member?.user.id !== "547624574070816799") return ctx.reply({content:ERRORS.NO_PERMS,ephemeral:true})
        
        let subcommand: SubCommand | undefined = SubCommands.find(sc => sc.name === ctx.options.data[0].name)

        if (!subcommand) return ctx.reply({content: ERRORS.INVALID_ARGUMENTS, ephemeral: true});
        return subcommand.run(ctx, getArguments(ctx, subcommand.options));
    }
}