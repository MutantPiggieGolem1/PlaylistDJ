import { ActionRow, ActionRowComponent, ApplicationCommandOptionChoiceData, ApplicationCommandOptionType, AutocompleteInteraction, BaseInteraction, ButtonInteraction, ButtonStyle, CommandInteraction, ComponentType, Embed, EmbedField, InteractionUpdateOptions, Message, MessageActionRowComponentData, ReplyMessageOptions } from "discord.js"
import { client } from "../../index"
import * as yt from "../../youtube/playlist"
import { getFullSong, RatedSong, Song, SongReference } from "../../youtube/util"
import { WebPlaylist } from "../../youtube/webplaylist"
import { error, ERRORS, isWhitelisted, ITEMS_PER_PAGE, reply, truncateString } from "../util"
import { Command, SubCommand } from "./Commands"

const commandname = "playlist"

const Create: SubCommand = {
    type: ApplicationCommandOptionType.Subcommand,
    name: "create",
    description: "Creates a playlist from existing songs.",
    options: [{
        type: ApplicationCommandOptionType.String,
        name: "url",
        description: "Youtube playlist URL with songs to add",
        required: true,
    }],
    public: true,

    run: (ctx: CommandInteraction | Message) => {
        if (!ctx.guild) return;
        // Argument Processing
        let arg1: string | undefined = ctx instanceof CommandInteraction ?
            ctx.options.get("url", true).value?.toString() :
            ctx.content.split(/\s+/g)[3]
        if (!arg1) return error(ctx, ERRORS.INVALID_ARGUMENTS)
        // Action Execution
        const guildid = ctx.guild.id;
        if (ctx instanceof CommandInteraction) ctx.deferReply({ephemeral: true});
        WebPlaylist.fromUrl(arg1).then((webpl: WebPlaylist) => 
            webpl.getIds()
        ).then(ids => 
            yt.Playlist.create(guildid, ids)
        ).then((playlist: yt.Playlist) => {
            reply(ctx, `Created a new playlist with ${playlist.getSongs.length} song(s)!`)
        }).catch((e: Error) => { error(ctx, e) })
    }
}
const Delete: SubCommand = {
    type: ApplicationCommandOptionType.Subcommand,
    name: "delete",
    description: "Deletes your playlist.",
    public: true,

    run: async (ctx: CommandInteraction | Message) => {
        if (!ctx.guild) return;
        // Message
        const msg = await reply(ctx, {
            content: "_",
            components: [{
                type: ComponentType.ActionRow,
                "components": [
                    {
                        "style": ButtonStyle.Success,
                        "label": `Confirm`,
                        "customId": `cplaylistdeleteconfirm`,
                        "disabled": false,
                        "type": ComponentType.Button
                    },
                    {
                        "style": ButtonStyle.Danger,
                        "label": `Cancel`,
                        "customId": `cancel`,
                        "disabled": false,
                        "type": ComponentType.Button
                    }
                ]
            }],
            embeds: [{
                title: "Are you sure you want to delete your playlist?",
                description: "This action is permanent and irreversible.",
                color: 0xFF0000,
                footer: {
                    text: "PlaylistDJ - Confirmation Dialog",
                    icon_url: client.user?.avatarURL() ?? ""
                }
            }]
        }, true)
        // Interaction Collection
        msg.createMessageComponentCollector<ComponentType.Button>({
            filter: (i: ButtonInteraction) => i.user.id === (ctx instanceof CommandInteraction ? ctx.user : ctx.author).id,
            time: 5 * 1000, max: 1
        }).once("collect", (interaction: ButtonInteraction): void => {
            if (interaction.customId === 'cancel') {interaction.update({ content: "Cancelled.", components: [], embeds: [] });return;}
            if (!interaction.guild) { error(ctx, ERRORS.NO_GUILD); return; }
            let playlist = yt.Playlist.getPlaylist(interaction.guild.id)
            if (!playlist) { error(ctx, ERRORS.NO_PLAYLIST); return; }
            playlist.delete().then(_ => {
                interaction.update({ content: `Deleted your playlist.`, components: [], embeds: [] })
            }).catch((e: Error) => error(ctx, e))
        }).on("end", (_, reason: string) => {
            if (reason === "idle" && msg.editable) msg.fetch().then(_=>msg.edit({ content: "Cancelled. (Timed Out)", components:[]})).catch()
        })
    },
}
const Add: SubCommand = {
    type: ApplicationCommandOptionType.Subcommand,
    name: "add",
    description: "Adds music to your playlist.",
    options: [{
        type: ApplicationCommandOptionType.String,
        name: "ids",
        description: "Song IDs to add",
        required: true,
    }],
    public: true,

    run: (ctx: CommandInteraction | Message) => {
        if (!ctx.guild) return;
        // Argument Processing
        let arg1: string | undefined = ctx instanceof CommandInteraction ?
            ctx.options.get("ids")?.value?.toString() :
            ctx.content.split(/\s+/g)[3]
        if (!arg1) return error(ctx, ERRORS.INVALID_ARGUMENTS);
        // Playlist Locating
        let playlist = yt.Playlist.getPlaylist(ctx.guild.id)
        if (!playlist) return error(ctx, ERRORS.NO_PLAYLIST);
        // Action Execution
        let added: (SongReference | null)[] = playlist.addSongs(arg1.split(",").map(i => i.trim())).map(yt.Playlist.getSong);
        if (added.length < 1) return error(ctx, new Error("No songs were added!"));
        reply(ctx, `Added ${added.length} song(s) to the playlist!\n> `+added.filter((sr: SongReference | null): sr is SongReference => !!sr)
            .map((s: Song) => truncateString(s.title, Math.floor(60/added.length))).join(", "));
    }
}
const Remove: SubCommand = {
    type: ApplicationCommandOptionType.Subcommand,
    name: "remove",
    description: "Removes music from your playlist.",
    options: [{
        "type": ApplicationCommandOptionType.String,
        "name": "ids",
        "description": "Song IDs to remove",
        "required": true,
    }],
    public: true,

    run: (ctx: CommandInteraction | Message) => {
        if (!ctx.guild) return;
        // Argument Processing
        let arg1: string | undefined = ctx instanceof CommandInteraction ?
            ctx.options.get("ids")?.value?.toString() :
            ctx.content.split(/\s+/g)[3]
        if (!arg1) return error(ctx, ERRORS.INVALID_ARGUMENTS);
        // Playlist Locating
        let playlist = yt.Playlist.getPlaylist(ctx.guild.id)
        if (!playlist) return error(ctx, ERRORS.NO_PLAYLIST);
        // Action Execution
        let removed: (SongReference | null)[] = playlist.removeSongs(arg1.split(",").map(i => i.trim())).map(yt.Playlist.getSong)
        if (removed.length < 1) return error(ctx, ERRORS.NO_SONG);
        reply(ctx, `Removed ${removed.length} song(s) from the playlist!\n> `+removed.filter((sr: SongReference | null): sr is SongReference => !!sr)
            .map((s: Song) => truncateString(s.title, Math.floor(60/removed.length))).join(", "));
    }
}
const List: SubCommand = {
    type: ApplicationCommandOptionType.Subcommand,
    name: "list",
    description: "Lists music on your playlist",
    options: [{
        "type": ApplicationCommandOptionType.String,
        "name": "key",
        "description": "Search filter",
        "required": false,
        choices: [
            { name: "Title", value: "title" },
            { name: "Artist", value: "artist" },
            { name: "Genre", value: "genre" },
            { name: "Tags", value: "tags" },
            { name: "Sort", value: "sort" }
        ]
    }, {
        "type": ApplicationCommandOptionType.String,
        "name": "term",
        "description": "Search term",
        "required": false
    }],
    public: true,

    run: async (ctx: CommandInteraction | Message) => {
        if (!ctx.guild) return;
        // Argument Processing
        let arg1: string | undefined = ctx instanceof CommandInteraction ?
            ctx.options.get("key", false)?.value?.toString() :
            ctx.content.split(/\s+/g)[3];
        let arg2: string | undefined = ctx instanceof CommandInteraction ?
            ctx.options.get("term", false)?.value?.toString() :
            ctx.content.split(/\s+/g).slice(4).join(" ");
        // Playlist Locating
        let playlist = yt.Playlist.getPlaylist(ctx.guild.id)
        if (!playlist) return error(ctx, ERRORS.NO_PLAYLIST);
        // Action Execution
        let items: (SongReference & RatedSong)[] = playlist.getSongs.map(getFullSong).filter((r): r is SongReference & RatedSong => !!r)
        let page = 0;
        if (arg1 && arg2) {
            let term = arg2.toLowerCase() ?? "";
            switch (arg1) {
                case 'title':
                    items = items.filter((i: Song) => i.title.toLowerCase().includes(term));
                    break;
                case 'artist':
                    items = items.filter((i: Song) => i.artist.toLowerCase().includes(term));
                    break;
                case 'genre':
                    items = items.filter((i: Song) => i.genre.toString().toLowerCase() === term);
                    break;
                case 'sort':
                    switch (term) {
                        case 'top':
                            items = items.filter((a: RatedSong) => a.score > 0);
                            items = items.sort((a: RatedSong, b: RatedSong) => b.score - a.score);
                            break;
                    }
                    break;
            }
        }
        // Interaction Standardization
        let rmsg: Message | undefined;
        if (ctx instanceof Message) {
            rmsg = await reply(ctx, {
                "content": "Click this button to continue:",
                "components": [{
                    type: ComponentType.ActionRow,
                    components: [{
                        "style": ButtonStyle.Success,
                        "label": `Continue`,
                        "customId": `continue`,
                        "disabled": false,
                        "type": ComponentType.Button,
                    } as MessageActionRowComponentData]
                }]
            }, true)
        }
        const rctx: ButtonInteraction | CommandInteraction | void = ctx instanceof Message ? (await rmsg?.awaitMessageComponent({
            componentType: ComponentType.Button,
            filter: (i: ButtonInteraction) => i.user.id===ctx.author.id,
            time: 10*1000
        }).catch(_=>{if (rmsg?.deletable) rmsg.delete()})) : ctx
        if (!rctx) return;
        if (rmsg?.deletable) await rmsg.delete()
        // Message
        const msg = await reply(rctx, listMessage<ReplyMessageOptions>(rctx, items, page))
        // Interaction Collection
        msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: (i: ButtonInteraction) => i.user.id === rctx.user.id,
            idle: 20 * 1000
        }).on('collect', (interaction: ButtonInteraction) => {
            switch (interaction.customId) {
                case `c${commandname}listpageup`:
                    page++;
                    break;
                case `c${commandname}listpagedown`:
                    page--;
                    break;
            }
            interaction.update(listMessage<InteractionUpdateOptions>(rctx, items, page))
        }).on('end', (_,reason: string) => {
            if (reason==="idle") rctx.fetchReply().then(_=>rctx.editReply({components:[]})).catch()
        })
    },
}
const Tag: SubCommand = {
    type: ApplicationCommandOptionType.Subcommand,
    name: "tag",
    description: "Modifies music tags",
    options: [{
        name: "id",
        description: "Song ID to edit",
        type: ApplicationCommandOptionType.String,
        required: true,
        autocomplete: true,
    }, {
        name: "tags",
        description: "Tags to set",
        type: ApplicationCommandOptionType.String,
        required: true
    }],
    public: true,

    run: async (ctx: CommandInteraction | Message) => {
        if (!ctx.guild) return;
        // Argument Processing
        let id: string | undefined = ctx instanceof CommandInteraction ?
            ctx.options.get("id", true).value?.toString() :
            ctx.content.split(/\s+/g)[3]
        if (!id) return error(ctx, ERRORS.INVALID_ARGUMENTS);
        // Playlist Locating (ish)
        const playlist = yt.Playlist.getPlaylist(ctx.guild.id)
        if (!playlist) return error(ctx, ERRORS.NO_PLAYLIST);
        const song: RatedSong | undefined = playlist.getSongs.find(rs => rs.id === id)
        if (!song) return error(ctx, ERRORS.NO_SONG);
        // Action Execution
        // TODO: This
    },

    ac(ctx: AutocompleteInteraction): ApplicationCommandOptionChoiceData[] | Error {
        if (!ctx.guild) return new Error(ERRORS.NO_GUILD);
        const playlist = yt.Playlist.getPlaylist(ctx.guild.id);
        if (!playlist || playlist.getSongs?.length < 1) return new Error(ERRORS.NO_PLAYLIST);
        const focused = ctx.options.getFocused().toString();
        if (focused.length <= 0) return []; // too many matches, don't bother
        return Object.values(playlist.getSongs)
        .map(yt.Playlist.getSong)
        .filter((sr: SongReference | null): sr is SongReference => !!sr)
        .filter((sr: SongReference)=>sr.id.startsWith(focused) || sr.title.toLowerCase().startsWith(focused.toLowerCase()))
        .map((s: Song) => {
            return {name:s.title,value:s.id} as ApplicationCommandOptionChoiceData
        })
    }
}

const SubCommands: SubCommand[] = [
    Create, Delete, Add, Remove, List, Tag
]
export const Playlist: Command = {
    name: commandname,
    description: "Manage your server playlist.",
    options: SubCommands,
    defaultMemberPermissions: "ManageGuild",
    public: true,

    run: (ctx: CommandInteraction | Message) => {
        if (!ctx.guild) return;
        let option: string = ctx instanceof CommandInteraction ? ctx.options.data[0].name : ctx.content.split(/\s+/g)[2]
        let subcommand: SubCommand | undefined = SubCommands.find(sc => sc.name === option)

        if (!subcommand) return error(ctx, ERRORS.INVALID_ARGUMENTS);
        if (!subcommand.public && !isWhitelisted(ctx)) return error(ctx, ERRORS.NO_PERMS);
        return subcommand.run(ctx);
    },

    ac: (ctx: AutocompleteInteraction) => {
        let command: SubCommand | undefined | null = SubCommands.find(c=>c.name===ctx.options.data[0].name);
        if (!command?.ac) return new Error("Autocomplete not recognized.");
    
        return command.ac(ctx);
    }
}

function listMessage<T extends ReplyMessageOptions | InteractionUpdateOptions>(ctx: BaseInteraction, items: Song[], page: number): T {
    if (!ctx.guild) return { content: "Couldn't find guild!" } as T;
    return {
        "content": "_",
        "components": [{
            "type": ComponentType.ActionRow, "components": [{
                "style": ButtonStyle.Primary,
                "label": `Prev Page`,
                "customId": `c${commandname}listpagedown`,
                "disabled": page <= 0,
                "type": ComponentType.Button
            }, {
                "style": ButtonStyle.Primary,
                "label": `Next Page`,
                "customId": `c${commandname}listpageup`,
                "disabled": page >= Math.floor(items.length / ITEMS_PER_PAGE),
                "type": ComponentType.Button
            }]
        } as ActionRow<ActionRowComponent>],
        "embeds": [{
            "type": "rich",
            "title": `All Results (${items.length})`,
            "description": `${ctx.guild.name.length > 20 ? ctx.guild.nameAcronym : ctx.guild.name} Server Playlist`,
            "color": 0xff0000,
            "fields": items.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE).map(s => {
                return {
                    "name": s.title,
                    "value": s.id,
                    "inline": true,
                } as EmbedField
            }) || { "name": "No Results", "value": "Out Of Bounds", "inline": false } as EmbedField,
            "footer": {
                "text": `PlaylistDJ - Song List - Page ${page + 1}/${Math.ceil(items.length / ITEMS_PER_PAGE)}`,
                "icon_url": client.user?.avatarURL() ?? ""
            }
        } as Partial<Embed>]
    } as T
}