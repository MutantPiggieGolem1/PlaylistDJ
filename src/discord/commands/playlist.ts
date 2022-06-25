import { BaseCommandInteraction, ButtonInteraction, EmbedField, Interaction, InteractionReplyOptions, InteractionUpdateOptions, Message, MessageActionRow, MessageActionRowComponent, MessageEmbed, MessageOptions, ReplyMessageOptions } from "discord.js"
import { client } from "../../index"
import * as yt from "../../youtube/playlist"
import { Genre, RatedSong } from "../../youtube/util"
import { editReply, error, ERRORS, isWhitelisted, truncateString } from "../util"
import { Command, SubCommand } from "./Commands"

let idata: { [key: string]: { playlist: yt.WebPlaylist, index: number, exclusions: Array<number> } } = {} // Option Cache

const Create: SubCommand = {
    type: "SUB_COMMAND",
    name: "create",
    description: "Creates a playlist from existing songs.",
    options: [{
        type: "STRING",
        name: "ids",
        description: "Song IDs to create your playlist with",
        required: true
    }],
    public: true,

    run: (ctx: BaseCommandInteraction | Message) => { // dj playlist create 123,456,789
        if (!ctx.guild) return;
        let arg1: string | undefined = ctx instanceof BaseCommandInteraction ?
            ctx.options.get("ids", true).value?.toString() :
            ctx.content.split(/\s+/g).slice(3).join("")
        if (!arg1) return error(ctx, ERRORS.INVALID_ARGUMENTS)
        let ids = arg1.split(",").map(i => i.trim());

        try {
            let playlist: yt.Playlist = yt.Playlist.create(ctx.guild.id, ids)
            reply(ctx, `Created a new playlist with ${playlist.playlistdata.items.length} song(s)!`)
        } catch (e) { error(ctx, e as Error) }
    }
}
const Delete: SubCommand = {
    type: "SUB_COMMAND",
    name: "delete",
    description: "Deletes your playlist.",
    options: [],
    public: true,

    run: (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        reply(ctx, {
            content: "_",
            components: [{
                "type": "ACTION_ROW",
                "components": [
                    {
                        "style": "SUCCESS",
                        "label": `Confirm`,
                        "custom_id": `cplaylistdeleteconfirm`,
                        "disabled": false,
                        "type": "BUTTON"
                    },
                    {
                        "style": "DANGER",
                        "label": `Cancel`,
                        "custom_id": `cancel`,
                        "disabled": ctx instanceof BaseCommandInteraction,
                        "type": "BUTTON"
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
            }],
            fetchReply: true
        })
    },

    interact: (ctx: ButtonInteraction) => {
        if (!ctx.guild) return;
        // Playlist Locating
        let playlist = yt.getPlaylist(ctx.guild.id)
        if (!playlist) return error(ctx, ERRORS.NO_PLAYLIST);
        // Action Execution
        playlist.delete().then(_ => {
            reply(ctx, `Deleted your playlist.`)
        }).catch((e: Error) => error(ctx, e))
    }
}
const Add: SubCommand = {
    type: "SUB_COMMAND",
    name: "add",
    description: "Adds music to your playlist.",
    options: [
        {
            "type": 3,
            "name": "ids",
            "description": "Song IDs to add",
            "required": true
        }
    ],
    public: true,

    run: (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        // Argument Processing
        let arg1: string | undefined = ctx instanceof BaseCommandInteraction ?
            ctx.options.get("ids")?.value?.toString() :
            ctx.content.split(/\s+/g)[3]
        if (!arg1) return error(ctx, ERRORS.INVALID_ARGUMENTS);
        // Playlist Locating
        let playlist = yt.getPlaylist(ctx.guild.id)
        if (!playlist) return error(ctx, ERRORS.NO_PLAYLIST);
        // Action Execution
        let added: RatedSong[] = playlist.addSongs(arg1.split(",").map(i => i.trim()))
        reply(ctx, `Added ${added.length} song(s) to the playlist!\n> ${added.map(rs => truncateString(rs.title, 10)).join(", ")}`)
    }
}
const Remove: SubCommand = {
    type: "SUB_COMMAND",
    name: "remove",
    description: "Removes music from your playlist.",
    options: [
        {
            "type": 3,
            "name": "ids",
            "description": "Song IDs to remove",
            "required": true
        }
    ],
    public: true,

    run: (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        // Argument Processing
        let arg1: string | undefined = ctx instanceof BaseCommandInteraction ?
            ctx.options.get("ids")?.value?.toString() :
            ctx.content.split(/\s+/g)[3]
        if (!arg1) return error(ctx, ERRORS.INVALID_ARGUMENTS);
        // Playlist Locating
        let playlist = yt.getPlaylist(ctx.guild.id)
        if (!playlist) return error(ctx, ERRORS.NO_PLAYLIST);
        // Action Execution
        let removed: RatedSong[] = playlist.removeSongs(arg1.split(",").map(i => i.trim()))
        reply(ctx, `Removed ${removed.length} song(s) from the playlist!\n> ${removed.map(rs => truncateString(rs.title, 10)).join(", ")}`)
    }
}
const List: SubCommand = {
    type: "SUB_COMMAND",
    name: "list",
    description: "Lists music on your playlist",
    options: [{
        "type": "STRING",
        "name": "term",
        "description": "Term to search for",
        "required": false
    }],
    public: true,

    run: (ctx: BaseCommandInteraction | Message) => {
        let arg1: string | undefined = ctx instanceof BaseCommandInteraction ?
            ctx.options.get("term", false)?.value?.toString() :
            ctx.content.split(/\s+/g).slice(3).join(" ");

        let options: GetMessageOptions = {};
        if (arg1 === "top") { options.filter = (a: RatedSong) => a.score > 0; options.sort = (a: RatedSong, b: RatedSong) => b.score - a.score; }
        else if (arg1) { options.filter = (i: RatedSong) => i.title.toLowerCase().includes(arg1?.toLowerCase() ?? "") }

        let m: ReplyMessageOptions & { fetchReply: true };
        if ((m = listMessage<ReplyMessageOptions & { fetchReply: true }>(ctx, options))) reply(ctx, m);
    },

    interact: (ctx: ButtonInteraction) => {
        switch (ctx.customId) {
            case 'cplaylistlistpageup':
                ctx.update(listMessage<InteractionUpdateOptions>(ctx, undefined, (Number.parseInt(ctx.message.content) || 0) + 1))
                break;
            case 'cplaylistlistpagedown':
                ctx.update(listMessage<InteractionUpdateOptions>(ctx, undefined, (Number.parseInt(ctx.message.content) || 0) - 1))
                break;
        }
    }
}
const Edit: SubCommand = {
    type: "SUB_COMMAND",
    name: "edit",
    description: "Modifies music metadata in your playlist.",
    options: [{
        name: "id",
        description: "Song ID to edit",
        type: "STRING",
        required: true,
    }, {
        name: "field",
        description: "Field to edit",
        type: "STRING",
        required: false
    }, {
        name: "value",
        description: "Value to assign",
        type: "STRING",
        required: false
    }],
    public: true,

    run: (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        // Argument Processing
        let id: string | undefined, field: string | undefined, value: string | undefined;
        if (ctx instanceof BaseCommandInteraction) {
            id = ctx.options.get("id", true).value?.toString()
            field = ctx.options.get("field", false)?.value?.toString()?.toLowerCase()
            value = ctx.options.get("value", false)?.value?.toString()
        } else {
            let args: string[] = ctx.content.split(/\s+/g).slice(3);
            id = args[0]
            field = args[1]?.toLowerCase()
            value = args.slice(2)?.join(" ")
        }
        if (!id || (field && !value)) return error(ctx, ERRORS.INVALID_ARGUMENTS);
        // Playlist Locating
        let playlist = yt.getPlaylist(ctx.guild.id)
        if (!playlist) return error(ctx, ERRORS.NO_PLAYLIST);
        // Action Execution
        let songindex: number = playlist.playlistdata.items.findIndex(i => i.id === id)
        if (songindex < 0) return error(ctx, ERRORS.NO_SONG);
        let song: RatedSong = playlist.playlistdata.items[songindex]

        if (field && value) {
            switch (field) {
                case "title":
                    song.title = value;
                    break;
                case "artist":
                    song.artist = value;
                    break;
                case "genre":
                    if (!Object.keys(Genre).includes(value)) return error(ctx, new Error(`Couldn't identify genre ${value}!`))
                    song.genre = <Genre>(<any>Genre)[value];
                    break;
                case "tags":
                    song.tags = value.split(",").map(v => v.trim())
                    break;
                default:
                    return error(ctx, ERRORS.INVALID_ARGUMENTS);
            }
        }
        playlist.editSong(song);

        reply(ctx, {
            "content": "_",
            "embeds": [{
                "type": "rich",
                "title": "Song ID: " + song.id,
                "description": "Song Metadata",
                "color": 0xff0000,
                "fields": [
                    {
                        "name": `Title:`,
                        "value": song.title,
                        "inline": true
                    } as EmbedField,
                    {
                        "name": `Artist:`,
                        "value": song.artist,
                        "inline": true
                    } as EmbedField,
                    {
                        "name": `Genre:`,
                        "value": song.genre.toString() ?? "Unknown",
                        "inline": true
                    } as EmbedField,
                    {
                        "name": `Score:`,
                        "value": song.score.toString(),
                        "inline": true
                    } as EmbedField,
                    {
                        "name": `Tags:`,
                        "value": song.tags?.join(", ") ?? "None",
                        inline: false
                    } as EmbedField
                ],
                "footer": {
                    "text": `PlaylistDJ - Metadata Editor`,
                    "icon_url": client.user?.avatarURL() ?? ""
                },
                "url": song.url
            }],
            "components": [{
                "type": "ACTION_ROW",
                "components": [
                    {
                        "style": "SUCCESS",
                        "label": `Save`,
                        "customId": `cplaylisteditsave`,
                        "disabled": false,
                        "type": "BUTTON",
                    } as MessageActionRowComponent,
                    {
                        "style": "DANGER",
                        "label": `Cancel`,
                        "customId": `cancel`,
                        "disabled": ctx instanceof BaseCommandInteraction,
                        "type": "BUTTON",
                    } as MessageActionRowComponent
                ]
            } as MessageActionRow],
            fetchReply: true
        } as ReplyMessageOptions & { fetchReply: true })
    },
    
    interact: (ctx: ButtonInteraction) => {
        if (!ctx.guild) return;
        // Playlist Locating
        let playlist = yt.getPlaylist(ctx.guild.id)
        if (!playlist) return error(ctx, ERRORS.NO_PLAYLIST);
        // Action Execution
        playlist.save().then(_=>{
            ctx.update({content: "Saved!", components:[]})
        })
    },
}
const Download: SubCommand = {
    type: "SUB_COMMAND",
    name: "download",
    description: "Downloads music from youtube.",
    options: [{
        "type": "STRING",
        name: "url",
        description: "Youtube URL to Download From",
        required: true,
    }],
    public: false,

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        let url: string | null | undefined = ctx instanceof BaseCommandInteraction ?
            ctx.options.get("url", true).value?.toString() :
            ctx.content.split(/\s+/g)[3]
        if (!url) return error(ctx, ERRORS.INVALID_ARGUMENTS);

        reply(ctx, "Detecting Playlist...");
        ctx.channel?.sendTyping()

        try {
            var webplaylist: yt.WebPlaylist = await yt.WebPlaylist.fromUrl(url);
        } catch (e) { return error(ctx, e as Error) }

        idata[ctx.guild.id] = { playlist: webplaylist, index: 0, exclusions: [] }
        await editReply(ctx, {
            "content": "Found!",
            "components": [
                {
                    "type": "ACTION_ROW",
                    "components": [
                        {
                            "style": "PRIMARY",
                            "label": `Custom Download`,
                            "customId": `cplaylistdownloadcustom`,
                            "disabled": webplaylist.ytplaylist.items.length <= 1,
                            "type": "BUTTON",
                        } as MessageActionRowComponent,
                        {
                            "style": "SUCCESS",
                            "label": `Download All`,
                            "customId": `cplaylistdownloadall`,
                            "disabled": false,
                            "type": "BUTTON",
                        } as MessageActionRowComponent,
                        {
                            "style": "DANGER",
                            "label": `Cancel`,
                            "customId": `cancel`,
                            "disabled": ctx instanceof BaseCommandInteraction,
                            "type": "BUTTON",
                        } as MessageActionRowComponent
                    ]
                } as MessageActionRow
            ],
            "embeds": [
                {
                    type: "rich",
                    title: `${webplaylist.ytplaylist.title} - ${webplaylist.ytplaylist.estimatedItemCount} Items`,
                    description: webplaylist.ytplaylist.description,
                    color: 0xFF0000,
                    "image": {
                        "url": webplaylist.ytplaylist.bestThumbnail.url ?? "",
                        "height": webplaylist.ytplaylist.bestThumbnail.height,
                        "width": webplaylist.ytplaylist.bestThumbnail.width
                    },
                    "author": webplaylist.ytplaylist.author ? {
                        "name": webplaylist.ytplaylist.author.name,
                        "iconURL": webplaylist.ytplaylist.author.bestAvatar.url,
                        "url": webplaylist.ytplaylist.author.url
                    } : { "name": "Unknown Author" },
                    "footer": {
                        "text": `PlaylistDJ - Playlist Download`,
                        "iconURL": client.user?.avatarURL() ?? ""
                    },
                    "url": webplaylist.ytplaylist.url,
                } as MessageEmbed
            ]
        } as MessageOptions);
    },

    interact: async (ctx: ButtonInteraction) => {
        if (!ctx.guild) return;
        const webplaylist: yt.WebPlaylist | undefined = idata[ctx.guild.id]?.playlist;
        if (!webplaylist) return error(ctx,ERRORS.NO_PLAYLIST);
        switch (ctx.customId) {
            case 'cplaylistdownloadcustomskip':
                idata[ctx.guild.id].exclusions.push(idata[ctx.guild.id].index)
            case 'cplaylistdownloadcustomkeep':
                idata[ctx.guild.id].index++;
            case 'cplaylistdownloadcustom':
                let video = webplaylist.ytplaylist.items[idata[ctx.guild.id].index];
                if (video) {
                    ctx.update({
                        "content": "Keep this video?",
                        "components": [
                            {
                                "type": "ACTION_ROW",
                                "components": [
                                    {
                                        "style": "SECONDARY",
                                        "label": `Keep Remaining`,
                                        "customId": `cplaylistdownloadcustomall`,
                                        "disabled": false,
                                        "type": "BUTTON",
                                    } as MessageActionRowComponent,
                                    {
                                        "style": "SUCCESS",
                                        "label": `Keep`,
                                        "customId": `cplaylistdownloadcustomkeep`,
                                        "disabled": false,
                                        "type": "BUTTON"
                                    } as MessageActionRowComponent,
                                    {
                                        "style": "DANGER",
                                        "label": `Skip`,
                                        "customId": `cplaylistdownloadcustomskip`,
                                        "disabled": false,
                                        "type": "BUTTON"
                                    } as MessageActionRowComponent,
                                    {
                                        "style": "SECONDARY",
                                        "label": `Skip Remaining`,
                                        "customId": `cplaylistdownloadcustomnone`,
                                        "disabled": false,
                                        "type": "BUTTON",
                                    } as MessageActionRowComponent,
                                ]
                            } as MessageActionRow
                        ],
                        "embeds": [
                            {
                                type: "rich",
                                title: video.title,
                                description: "",
                                color: 0xFF0000,
                                "image": {
                                    "url": video.bestThumbnail.url ?? "",
                                    "height": video.bestThumbnail.height,
                                    "width": video.bestThumbnail.width
                                },
                                "author": {
                                    "name": video.author.name,
                                    "url": video.author.url
                                },
                                "footer": {
                                    "text": `PlaylistDJ - Video Selection - Video ${idata[ctx.guild.id].index + 1}/${webplaylist.ytplaylist.items.length}`,
                                    "iconURL": client.user?.avatarURL() ?? ""
                                },
                                "url": video.url,
                            } as MessageEmbed
                        ]
                    } as InteractionUpdateOptions)
                    break;
                }
            case 'cplaylistdownloadcustomnone':
                for (let i = idata[ctx.guild.id].index; i < webplaylist.ytplaylist.items.length; i++) {
                    idata[ctx.guild.id].exclusions.push(i);
                }
            case 'cplaylistdownloadcustomall':
                if (idata[ctx.guild?.id]?.exclusions) { webplaylist.remove(idata[ctx.guild.id].exclusions) }
            case 'cplaylistdownloadall':
                delete idata[ctx.guild.id];

                // if (!ctx.deferred && ctx.isRepliable()) ctx.deferReply({ "ephemeral": true });
                webplaylist.download(ctx.guild?.id)
                    .once('start', (items) => {
                        ctx.reply(`Downloading: ${items?.length} songs.`)
                    }).on('progress', (cur: number, total: number) => {
                        ctx.editReply(`Downloaded: ${cur}/${total} songs.`);
                    }).on('finish', (playlist: yt.Playlist | undefined) => {
                        ctx.editReply(`Success! ${playlist ? playlist.playlistdata.items.length : 0} files downloaded (${playlist ? 'total' : 'non-fatal fail'})!`);
                    }).on('warn', (cur: number, total: number, error: Error) => {
                        ctx.editReply(`Downloaded: ${cur}/${total} songs. (Non-Fatal: ${error.message})`)
                    }).on('error', (e: Error) => {
                        ctx.editReply(`Error: ` + e.message);
                    })
                break;
        }
    }
}
const Clean: SubCommand = {
    type: "SUB_COMMAND",
    name: "clean",
    description: "Deletes unreferenced files globally.",
    public: false,

    run: (ctx: BaseCommandInteraction | Message) => {
        yt.Playlist.clean()
            .on('progress', async (message: string) => {
                await editReply(ctx, message)
            }).once('finish', (remainder: string[]) => {
                editReply(ctx, `Clean Complete! ${remainder.length} files remaining!`)
            }).once('error', async (e: Error) => { await error(ctx, e) })
    }
}

const SubCommands: SubCommand[] = [
    Create, Delete, Add, Remove, List, Edit,
    Download, Clean
]
export const Playlist: Command = {
    name: "playlist",
    description: "Manage your server playlist.",
    options: SubCommands,
    public: true,

    run: (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        let option: string = ctx instanceof BaseCommandInteraction ? ctx.options.data[0].name : ctx.content.split(/\s+/g)[2]
        let subcommand: SubCommand | undefined = SubCommands.find(sc => sc.name === option)

        if (!subcommand) return error(ctx, ERRORS.INVALID_ARGUMENTS);
        if (!subcommand.public && !isWhitelisted(ctx)) return error(ctx, ERRORS.NO_PERMS);
        return subcommand.run(ctx);
    },

    interact: (ctx: ButtonInteraction) => {
        if (!ctx.guild) return;
        let choice = ctx.customId.slice('cplaylist'.length)
        let subcommand: SubCommand | undefined = SubCommands.find(sc => choice.startsWith(sc.name)&&sc.interact)

        if (!subcommand?.interact) return console.error("Didn't find valid subcommand to process interaction: " + ctx.customId);
        if (!subcommand.public && !isWhitelisted(ctx)) return error(ctx,ERRORS.NO_PERMS);
        subcommand.interact(ctx);
    }
}

type GetMessageOptions = {
    filter?: (value: RatedSong, index: number, array: RatedSong[]) => unknown,
    sort?: (a: RatedSong, b: RatedSong) => number
}
function listMessage<T extends ReplyMessageOptions | InteractionUpdateOptions>(ctx: Interaction | Message, options?: GetMessageOptions, page = 0): T {
    if (!ctx.guild) return { content: "Couldn't find guild!" } as T;
    let pl = yt.getPlaylist(ctx.guild.id)
    if (!pl) return { content: "Couldn't find playlist!" } as T;
    let playlist = pl.playlistdata;
    if (options?.filter) playlist.items = playlist.items.filter(options.filter);
    if (options?.sort) playlist.items = playlist.items.sort(options.sort);
    return {
        "content": page.toString(),
        "components": [{
            "type": "ACTION_ROW", "components": [
                {
                    "style": "PRIMARY",
                    "label": `Prev Page`,
                    "customId": `cplaylistlistpagedown`,
                    "disabled": page <= 0,
                    "type": "BUTTON"
                } as MessageActionRowComponent,
                {
                    "style": "PRIMARY",
                    "label": `Next Page`,
                    "customId": `cplaylistlistpageup`,
                    "disabled": page >= Math.floor(playlist.items.length / 25),
                    "type": "BUTTON"
                } as MessageActionRowComponent,
                {
                    "style": "DANGER",
                    "label": "Cancel",
                    "customId": "cancel",
                    "disabled": ctx instanceof BaseCommandInteraction,
                    "type": "BUTTON"
                } as MessageActionRowComponent,
            ]
        } as MessageActionRow],
        "embeds": [{
            "type": "rich",
            "title": `${options?.sort ? "Top" : "All"} ${options?.filter ? "Results" : "Songs"} (${playlist.items.length})`,
            "description": `${ctx.guild.name.length > 20 ? ctx.guild.nameAcronym : ctx.guild.name} Server Playlist`,
            "color": 0xff0000,
            "fields": playlist.items.slice(page * 25, page * 25 + 25).map(s => {
                return {
                    "name": options?.sort ? `[${s.score} Score] ${truncateString(s.title, 25)}` : s.title,
                    "value": s.id,
                    "inline": true,
                } as EmbedField
            }) || { "name": "No Results", "value": "Out Of Bounds", "inline": false } as EmbedField,
            "footer": {
                "text": `PlaylistDJ - Song List - Page ${page + 1}/${Math.ceil(playlist.items.length / 25)}`,
                "iconURL": client.user?.avatarURL() ?? ""
            }
        } as MessageEmbed]
    } as T
}

function reply(ctx: BaseCommandInteraction | ButtonInteraction | Message, content: Omit<ReplyMessageOptions, "flags"> & { fetchReply: true } | Omit<InteractionReplyOptions, "flags"> & { fetchReply: true } | string): Promise<any> {
    if (typeof content === "string") content = { content, fetchReply: true }
    if (ctx instanceof ButtonInteraction) return ctx.reply({ ...content, ephemeral: true });
    return ctx.reply({ ...content, ephemeral: true })
}