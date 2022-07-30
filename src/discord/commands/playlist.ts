import { ApplicationCommandOptionChoiceData, AutocompleteInteraction, CommandInteraction, ButtonInteraction, ComponentType, EmbedField, InteractionUpdateOptions, Message, ActionRow, ActionRowComponent, Embed, ModalSubmitInteraction, ReplyMessageOptions, TextInputComponent, ApplicationCommandOptionType, ButtonStyle, MessageActionRowComponentData, TextInputComponentData, TextInputStyle, BaseInteraction, ModalActionRowComponentData, ModalData, ModalComponentData, ModalActionRowComponent } from "discord.js"
import { client } from "../../index"
import * as yt from "../../youtube/playlist"
import { Genre, RatedSong } from "../../youtube/util"
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
        if (ctx instanceof CommandInteraction) ctx.deferReply();
        yt.WebPlaylist.fromUrl(arg1).then((webpl: yt.WebPlaylist) => 
            webpl.getIds()
        ).then(ids => 
            yt.Playlist.create(guildid, ids, arg1)
        ).then((playlist: yt.Playlist) => {
            reply(ctx, `Created a new playlist with ${playlist.playlistdata.items.length} song(s)!`)
        }).catch((e: Error) => { error(ctx, e as Error) })
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
            }],
            fetchReply: true
        }, true)
        // Interaction Collection
        msg.createMessageComponentCollector<ComponentType.Button>({
            filter: (i: ButtonInteraction) => i.user.id === (ctx instanceof CommandInteraction ? ctx.user : ctx.author).id,
            time: 5 * 1000, max: 1
        }).once("collect", (interaction: ButtonInteraction): void => {
            if (interaction.customId === 'cancel') {interaction.update({ content: "Cancelled.", components: [], embeds: [] });return;}
            if (!interaction.guild) { error(ctx, ERRORS.NO_GUILD); return; }
            let playlist = yt.getPlaylist(interaction.guild.id)
            if (!playlist) { error(ctx, ERRORS.NO_PLAYLIST); return; }
            playlist.delete().then(_ => {
                interaction.update({ content: `Deleted your playlist.`, components: [], embeds: [] })
            }).catch((e: Error) => error(ctx, e))
        }).on("end", (_, reason: string) => {
            if (msg.editable && reason === "idle") msg.edit({ content: "Cancelled. (Timed Out)", components:[]})
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
        let playlist = yt.getPlaylist(ctx.guild.id)
        if (!playlist) return error(ctx, ERRORS.NO_PLAYLIST);
        // Action Execution
        let added: RatedSong[] = playlist.addSongs(arg1.split(",").map(i => i.trim()));
        if (added.length < 1) return error(ctx, ERRORS.NO_SONG);
        reply(ctx, `Added ${added.length} song(s) to the playlist!\n> ${added.map(rs => truncateString(rs.title, Math.floor(60/added.length))).join(", ")}`)
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
        let playlist = yt.getPlaylist(ctx.guild.id)
        if (!playlist) return error(ctx, ERRORS.NO_PLAYLIST);
        // Action Execution
        let removed: RatedSong[] = playlist.removeSongs(arg1.split(",").map(i => i.trim()))
        if (removed.length < 1) return error(ctx, ERRORS.NO_SONG);
        reply(ctx, `Removed ${removed.length} song(s) from the playlist!\n> ${removed.map(rs => truncateString(rs.title, Math.floor(60/removed.length))).join(", ")}`)
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
            if (reason==="idle") rctx.editReply({components:[]})
        })
    },
}
const Edit: SubCommand = {
    type: ApplicationCommandOptionType.Subcommand,
    name: "edit",
    description: "Modifies music metadata in your playlist.",
    options: [{
        name: "id",
        description: "Song ID to edit",
        type: ApplicationCommandOptionType.String,
        required: true,
        autocomplete: true,
    }],
    public: true,

    run: async (ctx: CommandInteraction | Message) => {
        if (!ctx.guild) return;
        // Argument Processing
        let id: string | undefined, field: string | undefined, value: string | undefined;
        if (ctx instanceof CommandInteraction) {
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
        // Action Execution
        await rctx.showModal({
            customId: `c${commandname}editedit`,
            title: `Song Metadata Editor [${song.id}]`,
            components: [{
                type: ComponentType.ActionRow,
                components: [{
                    customId: `meditedittitle`,
                    label: "Song Title:",
                    maxLength: 64,
                    placeholder: song.title,
                    required: false,
                    style: TextInputStyle.Short,
                    type: ComponentType.TextInput
                } as ModalActionRowComponentData]
            } as ActionRow<TextInputComponent>, {
                type: ComponentType.ActionRow,
                components: [{
                    customId: `mediteditartist`,
                    label: "Song Artist:",
                    maxLength: 32,
                    placeholder: song.artist,
                    required: false,
                    style: TextInputStyle.Short,
                    type: ComponentType.TextInput
                } as ModalActionRowComponentData]
            } as ActionRow<ModalActionRowComponent>, {
                type: ComponentType.ActionRow,
                components: [{
                    customId: `mediteditgenre`,
                    label: "Song Genre:",
                    maxLength: 16,
                    placeholder: song.genre.toString(),
                    required: false,
                    style: TextInputStyle.Short,
                    type: ComponentType.TextInput
                } as ModalActionRowComponentData]
            } as ActionRow<ModalActionRowComponent>, {
                type: ComponentType.ActionRow,
                components: [{
                    customId: `meditedittags`,
                    label: "Tags:",
                    maxLength: 128,
                    placeholder: song.tags?.join(", ") || "None",
                    required: false,
                    style: TextInputStyle.Paragraph,
                    type: ComponentType.TextInput
                } as ModalActionRowComponentData]
            } as ActionRow<ModalActionRowComponent>]
        } as ModalComponentData)
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
        await playlist.save()
        await reply(interaction, {
            ephemeral: true,
            "content": "Saved!",
            "embeds": [{
                "title": "Song ID: " + song.id,
                "description": "Song Metadata",
                "color": 0xff0000,
                "fields": [
                    {
                        "name": `Title:`,
                        "value": song.title || "-",
                        "inline": true
                    } as EmbedField,
                    {
                        "name": `Artist:`,
                        "value": song.artist || "-",
                        "inline": true
                    } as EmbedField,
                    {
                        "name": `Genre:`,
                        "value": song.genre?.toString() || "-",
                        "inline": true
                    } as EmbedField,
                    {
                        "name": `Score:`,
                        "value": song.score?.toString() || "-",
                        "inline": true
                    } as EmbedField,
                    {
                        "name": `Tags:`,
                        "value": song.tags?.join(", ") || "None",
                        inline: false
                    } as EmbedField
                ],
                "footer": {
                    "text": `PlaylistDJ - Metadata Viewer`,
                    "icon_url": client.user?.avatarURL() ?? ""
                },
                "url": song.url
            }]
        })
    },

    ac(ctx: AutocompleteInteraction): ApplicationCommandOptionChoiceData[] | Error {
        if (!ctx.guild) return new Error(ERRORS.NO_GUILD);
        const playlist = yt.getPlaylist(ctx.guild.id);
        if (!playlist?.playlistdata.items || playlist.playlistdata.items.length <= 0) return new Error(ERRORS.NO_PLAYLIST);
        const focused = ctx.options.getFocused().toString();
        if (focused.length <= 0) return []; // too many matches, don't bother
        return Object.values(playlist.playlistdata.items)
            .filter(k=>k.id.startsWith(focused))
            .map(o=>{
                return {name:o.title,value:o.id} as ApplicationCommandOptionChoiceData
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

function listMessage<T extends ReplyMessageOptions | InteractionUpdateOptions>(ctx: BaseInteraction, items: RatedSong[], page: number): T {
    if (!ctx.guild) return { content: "Couldn't find guild!" } as T;
    return {
        "content": "_",
        "components": [{
            "type": ComponentType.ActionRow, "components": [
                {
                    "style": ButtonStyle.Primary,
                    "label": `Prev Page`,
                    "customId": `c${commandname}listpagedown`,
                    "disabled": page <= 0,
                    "type": ComponentType.Button
                } as ActionRowComponent,
                {
                    "style": ButtonStyle.Primary,
                    "label": `Next Page`,
                    "customId": `c${commandname}listpageup`,
                    "disabled": page >= Math.floor(items.length / ITEMS_PER_PAGE),
                    "type": ComponentType.Button
                } as ActionRowComponent
            ]
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