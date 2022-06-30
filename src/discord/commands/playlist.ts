import { BaseCommandInteraction, ButtonInteraction, EmbedField, Interaction, InteractionUpdateOptions, Message, MessageActionRow, MessageActionRowComponent, MessageButton, MessageEmbed, ModalOptions, ModalSubmitInteraction, ReplyMessageOptions, TextInputComponent } from "discord.js"
import { client } from "../../index"
import * as yt from "../../youtube/playlist"
import { Genre, RatedSong } from "../../youtube/util"
import { error, ERRORS, isWhitelisted, ITEMS_PER_PAGE, reply, truncateString } from "../util"
import { Command, SubCommand } from "./Commands"

const commandname = "playlist"

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

        yt.Playlist.create(ctx.guild.id, ids).then((playlist: yt.Playlist) => {
            reply(ctx, `Created a new playlist with ${playlist.playlistdata.items.length} song(s)!`)
        }).catch((e: Error) => { error(ctx, e as Error) })
    }
}
const Delete: SubCommand = {
    type: "SUB_COMMAND",
    name: "delete",
    description: "Deletes your playlist.",
    public: true,

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        // Message
        const msg = await reply(ctx, {
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
        // Interaction Collection
        msg.createMessageComponentCollector({
            componentType: "BUTTON",
            filter: (i: ButtonInteraction) => i.user.id === (ctx instanceof BaseCommandInteraction ? ctx.user : ctx.author).id,
            max: 1,
            time: 5 * 1000
        }).on('collect', (interaction: ButtonInteraction) => {
            if (interaction.customId === 'cancel') return interaction.update({ components: [] });
            if (!interaction.guild) { error(ctx, ERRORS.NO_GUILD); return; }
            let playlist = yt.getPlaylist(interaction.guild.id)
            if (!playlist) { error(ctx, ERRORS.NO_PLAYLIST); return; }
            playlist.delete().then(_ => {
                interaction.update({ content: `Deleted your playlist.`, components: [] })
            }).catch((e: Error) => error(ctx, e))
        }).on('end', (_,reason: string) => {
            if (reason==="idle" && msg.editable) msg.edit({components:[]})
        })
    },
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
        reply(ctx, `Added ${added.length} song(s) to the playlist!\n> ${added.map(rs => truncateString(rs.title, Math.floor(60 / added.length))).join(", ")}`)
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
        "type": "STRING",
        "name": "term",
        "description": "Search term",
        "required": false
    }],
    public: true,

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        // Argument Processing
        let arg1: string | undefined = ctx instanceof BaseCommandInteraction ?
            ctx.options.get("key", false)?.value?.toString() :
            ctx.content.split(/\s+/g)[3];
        let arg2: string | undefined = ctx instanceof BaseCommandInteraction ?
            ctx.options.get("term", false)?.value?.toString() :
            ctx.content.split(/\s+/g).slice(4).join(" ");
        // Playlist Locating
        let playlist = yt.getPlaylist(ctx.guild.id)
        if (!playlist) return error(ctx, ERRORS.NO_PLAYLIST);
        // Action Execution
        let items: RatedSong[] = playlist.playlistdata.items
        let page = 0;
        if (arg1 && arg2) {
            let term = arg2.toLowerCase() ?? "";
            switch (arg1) {
                case 'title':
                    items = items.filter((i: RatedSong) => i.title.toLowerCase().includes(term));
                    break;
                case 'artist':
                    items = items.filter((i: RatedSong) => i.artist.toLowerCase().includes(term));
                    break;
                case 'genre':
                    items = items.filter((i: RatedSong) => i.genre.toString().toLowerCase() === term);
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
                    type: "ACTION_ROW",
                    components: [{
                        "style": "SUCCESS",
                        "label": `Continue`,
                        "customId": `continue`,
                        "disabled": false,
                        "type": "BUTTON",
                    } as MessageActionRowComponent]
                }]
            })
        }
        const rctx: ButtonInteraction | BaseCommandInteraction | void = ctx instanceof Message ? (await rmsg?.awaitMessageComponent({
            componentType: "BUTTON",
            filter: (i: ButtonInteraction) => i.user.id===ctx.author.id,
            time: 10*1000
        }).catch(_=>{if (rmsg?.deletable) rmsg.delete()})) : ctx
        if (!rctx) return;
        if (rmsg?.deletable) await rmsg.delete()
        // Message
        const msg = await reply(rctx, listMessage<ReplyMessageOptions>(rctx, items, page))
        // Interaction Collection
        msg.createMessageComponentCollector({
            componentType: "BUTTON",
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
                default:
                    return interaction.update({ components: [] });
            }
            interaction.update(listMessage<InteractionUpdateOptions>(rctx, items, page))
        }).on('end', (_,reason: string) => {
            if (reason==="idle") rctx.editReply({components:[]})
        })
    },
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
    }],
    public: true,

    run: async (ctx: BaseCommandInteraction | Message) => {
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
        // Playlist Locating (ish)
        const playlist = yt.getPlaylist(ctx.guild.id)
        if (!playlist) return error(ctx, ERRORS.NO_PLAYLIST);
        let songindex: number = playlist.playlistdata.items.findIndex(i => i.id === id)
        if (songindex < 0) return error(ctx, ERRORS.NO_SONG);
        const song: RatedSong = playlist.playlistdata.items[songindex]
        // Interaction Standardization
        let rmsg: Message | undefined;
        if (ctx instanceof Message) {
            rmsg = await reply(ctx, {
                "content": "Click this button to continue:",
                "components": [{
                    type: "ACTION_ROW",
                    components: [{
                        "style": "SUCCESS",
                        "label": `Continue`,
                        "customId": `continue`,
                        "disabled": false,
                        "type": "BUTTON",
                    } as MessageActionRowComponent]
                }]
            })
        }
        const rctx: ButtonInteraction | BaseCommandInteraction | void = ctx instanceof Message ? (await rmsg?.awaitMessageComponent({
            componentType: "BUTTON",
            filter: (i: ButtonInteraction) => i.user.id===ctx.author.id,
            time: 10*1000
        }).catch(_=>{if (rmsg?.deletable) rmsg.delete()})) : ctx
        if (!rctx) return;
        if (rmsg?.deletable) await rmsg.delete()
        // Action Execution
        await rctx.showModal({
            customId: `c${commandname}editedit`,
            title: `Song Metadata Editor [${song.id}]`,
            components: [{
                type: "ACTION_ROW",
                components: [{
                    customId: `meditedittitle`,
                    label: "Song Title:",
                    maxLength: 64,
                    placeholder: song.title,
                    required: false,
                    style: "SHORT",
                    type: "TEXT_INPUT"
                } as TextInputComponent]
            } as MessageActionRow<TextInputComponent>, {
                type: "ACTION_ROW",
                components: [{
                    customId: `mediteditartist`,
                    label: "Song Artist:",
                    maxLength: 32,
                    placeholder: song.artist,
                    required: false,
                    style: "SHORT",
                    type: "TEXT_INPUT"
                } as TextInputComponent]
            } as MessageActionRow<TextInputComponent>, {
                type: "ACTION_ROW",
                components: [{
                    customId: `mediteditgenre`,
                    label: "Song Genre:",
                    maxLength: 16,
                    placeholder: song.genre.toString(),
                    required: false,
                    style: "SHORT",
                    type: "TEXT_INPUT"
                } as TextInputComponent]
            } as MessageActionRow<TextInputComponent>, {
                type: "ACTION_ROW",
                components: [{
                    customId: `meditedittags`,
                    label: "Tags:",
                    maxLength: 128,
                    placeholder: song.tags?.join(", ") || "None",
                    required: false,
                    style: "PARAGRAPH",
                    type: "TEXT_INPUT"
                } as TextInputComponent]
            } as MessageActionRow<TextInputComponent>]
        } as ModalOptions)
        // Interaction Collection
        const interaction: ModalSubmitInteraction | void = await rctx.awaitModalSubmit({ time: 5 * 60 * 1000 }).catch((e: Error) => {error(rctx,e)})
        if (!interaction) return;
        song.title = interaction.fields.getTextInputValue(`meditedittitle`) || song.title
        song.artist = interaction.fields.getTextInputValue(`mediteditartist`) || song.artist
        let genre = interaction.fields.getTextInputValue(`mediteditgenre`)
        if (genre) {
            if (!Object.keys(Genre).includes(genre)) return error(ctx, new Error(`Couldn't identify genre ${genre}!`))
            song.genre = <Genre>(<any>Genre)[genre];
        }
        song.tags = interaction.fields.getTextInputValue(`meditedittags`)?.split(",")?.map(i => i.trim()) || song.tags

        playlist.editSong(song);
        (await reply(interaction, {
            ephemeral: true,
            "content": "_",
            "embeds": [{
                "title": "Song ID: " + song.id,
                "description": "Song Metadata",
                "color": 0xff0000,
                "fields": [
                    {
                        "name": `Title:`,
                        "value": song.title ?? "-",
                        "inline": true
                    } as EmbedField,
                    {
                        "name": `Artist:`,
                        "value": song.artist ?? "-",
                        "inline": true
                    } as EmbedField,
                    {
                        "name": `Genre:`,
                        "value": song.genre.toString() ?? "-",
                        "inline": true
                    } as EmbedField,
                    {
                        "name": `Score:`,
                        "value": song.score.toString() ?? "-",
                        "inline": true
                    } as EmbedField,
                    {
                        "name": `Tags:`,
                        "value": song.tags?.join(", ") ?? "None",
                        inline: false
                    } as EmbedField
                ],
                "footer": {
                    "text": `PlaylistDJ - Metadata Viewer`,
                    "icon_url": client.user?.avatarURL() ?? ""
                },
                "url": song.url
            }],
            "components": [{
                "type": "ACTION_ROW",
                "components": [{
                    "style": "SUCCESS",
                    "label": `Save`,
                    "customId": `c${commandname}editsave`,
                    "disabled": false,
                    "type": "BUTTON",
                } as MessageButton]
            } as MessageActionRow],
        })).createMessageComponentCollector({
            componentType: "BUTTON",
            filter: (i: ButtonInteraction) => i.user.id === rctx.user.id,
            max: 1,
            time: 10 * 1000
        }).on('collect',_=>playlist.save().then(_ => interaction.update({ content: "Saved!", components: [] }))).on('end', (_,reason: string) => {
            if (reason==="idle") interaction.editReply({components:[]});
        })
    }
}

const SubCommands: SubCommand[] = [
    Create, Delete, Add, Remove, List, Edit
]
export const Playlist: Command = {
    name: commandname,
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
    }
}

function listMessage<T extends ReplyMessageOptions | InteractionUpdateOptions>(ctx: Interaction, items: RatedSong[], page: number): T {
    if (!ctx.guild) return { content: "Couldn't find guild!" } as T;
    return {
        "content": "_",
        "components": [{
            "type": "ACTION_ROW", "components": [
                {
                    "style": "PRIMARY",
                    "label": `Prev Page`,
                    "customId": `c${commandname}listpagedown`,
                    "disabled": page <= 0,
                    "type": "BUTTON"
                } as MessageActionRowComponent,
                {
                    "style": "PRIMARY",
                    "label": `Next Page`,
                    "customId": `c${commandname}listpageup`,
                    "disabled": page >= Math.floor(items.length / ITEMS_PER_PAGE),
                    "type": "BUTTON"
                } as MessageActionRowComponent
            ]
        } as MessageActionRow],
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
                "iconURL": client.user?.avatarURL() ?? ""
            }
        } as MessageEmbed]
    } as T
}