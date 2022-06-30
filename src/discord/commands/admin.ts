import { BaseCommandInteraction, Message, ReplyMessageOptions, ButtonInteraction, InteractionUpdateOptions, EmbedField, MessageActionRowComponent, MessageActionRow, MessageEmbed, MessageOptions, User, Interaction, Modal, ModalSubmitInteraction, TextInputComponent, ModalOptions } from "discord.js";
import { client, WHITELIST } from "../../index";
import { Playlist, WebPlaylist } from "../../youtube/playlist";
import { SongReference, Genre, Song } from "../../youtube/util";
import { error, ERRORS, editReply, isWhitelisted, reply, ITEMS_PER_PAGE } from "../util";
import { Command, SubCommand, SubCommandGroup } from "./Commands";

const commandname = "admin"

const Amend: SubCommand = {
    type: "SUB_COMMAND",
    name: "amend",
    description: "Modifies music metadata in the music database.",
    options: [{
        name: "id",
        description: "Song ID to edit",
        type: "STRING",
        required: true,
    }],
    public: false,

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        // Argument Processing
        const id: string | undefined = ctx instanceof BaseCommandInteraction ?
            ctx.options.get("id", true).value?.toString() :
            ctx.content.split(/\s+/g)[3]
        if (!id) return error(ctx, ERRORS.INVALID_ARGUMENTS);
        // Playlist Locating (ish)
        const song: SongReference | undefined = Playlist.INDEX[id]
        if (!song) return error(ctx, ERRORS.NO_SONG);
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
        rctx.showModal({
            customId: `c${commandname}amendedit`,
            title: `Song Metadata Editor [${song.id}]`,
            components: [{
                type: "ACTION_ROW",
                components: [{
                    customId: `mamendedittitle`,
                    label: "Song Title:",
                    maxLength: 64,
                    minLength: 1,
                    placeholder: song.title,
                    required: false,
                    style: "SHORT",
                    type: "TEXT_INPUT"
                } as TextInputComponent]
            } as MessageActionRow<TextInputComponent>,{
                type: "ACTION_ROW",
                components: [{
                    customId: `mamendeditartist`,
                    label: "Song Artist:",
                    maxLength: 32,
                    minLength: 1,
                    placeholder: song.artist,
                    required: false,
                    style: "SHORT",
                    type: "TEXT_INPUT"
                } as TextInputComponent]
            } as MessageActionRow<TextInputComponent>,{
                type: "ACTION_ROW",
                components: [{
                    customId: `mamendeditgenre`,
                    label: "Song Genre:",
                    maxLength: 16,
                    minLength: 1,
                    placeholder: song.genre.toString(),
                    required: false,
                    style: "SHORT",
                    type: "TEXT_INPUT"
                } as TextInputComponent]
            } as MessageActionRow<TextInputComponent>]
        } as ModalOptions).then(async _=> {
            if (ctx instanceof Message && await rctx.fetchReply()) await rctx.deleteReply()
            return rctx.awaitModalSubmit({time:5*60*1000})
        }).then(async (interaction: ModalSubmitInteraction) => {
            song.title = interaction.fields.getTextInputValue(`mamendedittitle`) || song.title
            song.artist= interaction.fields.getTextInputValue(`mamendeditartist`)|| song.artist
            let genre = interaction.fields.getTextInputValue(`mamendeditgenre`)
            if (genre) {
                if (!Object.keys(Genre).includes(genre)) return error(ctx, new Error(`Couldn't identify genre ${genre}!`))
                song.genre = <Genre>(<any>Genre)[genre];
            }
            await Playlist.setMusicIndex()
            return interaction.reply({
                ephemeral: true,
                "content": "_",
                "embeds": [{
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
                            "value": song.genre.toString(),
                            "inline": true
                        } as EmbedField
                    ],
                    "footer": {
                        "text": `PlaylistDJ - Global Metadata Viewer`,
                        "icon_url": client.user?.avatarURL() ?? ""
                    },
                    "url": song.url
                }]
            })
        }).catch(_ => {
            return rctx.deleteReply().catch(_=>{})
        })
    },
}
const Auth: SubCommandGroup = {
    name: "auth",
    description: "Modifies users with administrator privileges.",
    type: "SUB_COMMAND_GROUP",
    public: false,
    options: [
        {
            "type": "SUB_COMMAND",
            "name": "add",
            "description": "Authorizes a user",
            "options": [
                {
                    "type": "USER",
                    "name": "user",
                    "description": "User to authorize",
                    "required": true
                }
            ]
        },
        {
            "type": "SUB_COMMAND",
            "name": "remove",
            "description": "Deauthorizes a user",
            "options": [{
                "type": "USER",
                "name": "user",
                "description": "User to deauthorize",
                "required": true,
            }]
        },
        {
            "type": "SUB_COMMAND",
            "name": "list",
            "description": "List authorized users"
        }
    ],

    run: (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return
        if (ctx.member?.user.id !== "547624574070816799") return error(ctx,ERRORS.NO_PERMS)
        let user: User | undefined, option: string
        if (ctx instanceof BaseCommandInteraction) {
            option = ctx.options.data[0]?.options ? ctx.options.data[0]?.options[0].name : ""
            user = ctx.options.get("user", false)?.user
        } else {
            let u: string;
            [option, u] = ctx.content.split(/\s+/g).slice(3)
            if (u) user = ctx.guild.members.resolve(u.replaceAll(/\D/g, ""))?.user ?? ctx.guild.members.cache.find(m => m.displayName === u)?.user
        }

        switch (option) {
            case 'add':
                if (!user) return error(ctx, ERRORS.NO_USER);
                if (!WHITELIST.has(user.id)) {
                    WHITELIST.add(user.id)
                    editReply(ctx, `Added ${user.tag} to the whitelist.`)
                } else {
                    error(ctx, new Error(`${user.tag} was already on the whitelist.`))
                }
                break;
            case 'remove':
                if (!user) return error(ctx, ERRORS.NO_USER);
                if (WHITELIST.has(user.id)) {
                    WHITELIST.delete(user.id)
                    editReply(ctx, `Removed ${user.tag} from the whitelist.`)
                } else {
                    error(ctx, new Error(`${user.tag} wasn't on the whitelist.`))
                }
                break
            case 'list':
                editReply(ctx, {
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
                } as MessageOptions)
                break
            default:
                error(ctx, ERRORS.INVALID_ARGUMENTS);
                break
        }
    }
}
const Clean: SubCommand = {
    type: "SUB_COMMAND",
    name: "clean",
    description: "Deletes unreferenced files globally.",
    public: false,

    run: (ctx: BaseCommandInteraction | Message) => {
        Playlist.clean()
            // .on('progress', async (message: string) => {
            //     // await editReply(ctx, message) // 
            // }) Interaction already responded or something
            .once('finish', (remainder: string[]) => {
                reply(ctx, `Clean Complete! ${remainder.length} files remaining!`)
            }).once('error', async (e: Error) => { error(ctx, e) })
    }
}
const Destroy: SubCommand = {
    type: "SUB_COMMAND",
    name: "destroy",
    description: "Deletes music from the filesystem.",
    public: false,
    options: [{
        name: "id",
        description: "Song ID(s) to delete",
        type: "STRING",
        required: true,
    }],

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        // Argument Processing
        let inp: string | undefined = ctx instanceof BaseCommandInteraction
            ? ctx.options.get("id",true).value?.toString()
            : ctx.content.split(/\s+/g)[3]
        if (!inp) return error(ctx, ERRORS.INVALID_ARGUMENTS);
        let ids: string[] = inp.split(",").slice(undefined,10).map(id=>id.trim())
        if (ids.length <= 0) return error(ctx, ERRORS.INVALID_ARGUMENTS);
        // Action Execution
        let removed: string[] = await Playlist.delete(ids);
        await editReply(ctx,`Success! Destroyed ${removed.length} song(s).`)
    }
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
        // Argument Processing
        let arg1: string | null | undefined = ctx instanceof BaseCommandInteraction ?
            ctx.options.get("url", true).value?.toString() :
            ctx.content.split(/\s+/g)[3]
        if (!arg1) return error(ctx, ERRORS.INVALID_ARGUMENTS);
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
        // Playlist Locating
        await rctx.reply({content: "Searching for Playlist...", ephemeral: true})
        try {
            var webpl: WebPlaylist = await WebPlaylist.fromUrl(arg1);
        } catch (e) { return error(rctx, e as Error) }
        // Action Execution
        const idata: {index: number, exclusions: number[]} = { index: 0, exclusions: [] };
        if (rctx instanceof ButtonInteraction && (rctx.message as Message).deletable) await (rctx.message as Message).delete();
        const msg: Message = (await rctx.editReply({
            ephemeral: true,
            "content": "Found!",
            "components": [
                {
                    "type": "ACTION_ROW",
                    "components": [
                        {
                            "style": "PRIMARY",
                            "label": `Custom Download`,
                            "customId": `c${commandname}downloadcustom`,
                            "disabled": webpl.ytplaylist.items.length <= 1,
                            "type": "BUTTON",
                        } as MessageActionRowComponent,
                        {
                            "style": "SUCCESS",
                            "label": `Download All`,
                            "customId": `c${commandname}downloadall`,
                            "disabled": false,
                            "type": "BUTTON",
                        } as MessageActionRowComponent,
                    ]
                } as MessageActionRow
            ],
            "embeds": [
                {
                    type: "rich",
                    title: `${webpl.ytplaylist.title} - ${webpl.ytplaylist.estimatedItemCount} Items`,
                    description: webpl.ytplaylist.description,
                    color: 0xFF0000,
                    "image": {
                        "url": webpl.ytplaylist.bestThumbnail.url ?? "",
                        "height": webpl.ytplaylist.bestThumbnail.height,
                        "width": webpl.ytplaylist.bestThumbnail.width
                    },
                    "author": webpl.ytplaylist.author ? {
                        "name": webpl.ytplaylist.author.name,
                        "iconURL": webpl.ytplaylist.author.bestAvatar.url,
                        "url": webpl.ytplaylist.author.url
                    } : { "name": "Unknown Author" },
                    "footer": {
                        "text": `PlaylistDJ - Playlist Download`,
                        "iconURL": client.user?.avatarURL() ?? ""
                    },
                    "url": webpl.ytplaylist.url,
                } as MessageEmbed
            ]
        } as MessageOptions) as Message)
        // Interaction Collection
        msg.createMessageComponentCollector({
            componentType: "BUTTON",
            filter: (i: ButtonInteraction) => i.user.id===rctx.user.id,
            idle: 20*1000
        }).on('collect', async (interaction: ButtonInteraction) => {
            switch (interaction.customId) {
                case `c${commandname}downloadcustomskip`:
                    idata.exclusions.push(idata.index)
                case `c${commandname}downloadcustomkeep`:
                    idata.index++;
                case `c${commandname}downloadcustom`:
                    let video = webpl.ytplaylist.items[idata.index];
                    if (video) {
                        interaction.update({
                            "content": "Keep this video?",
                            "components": [
                                {
                                    "type": "ACTION_ROW",
                                    "components": [
                                        {
                                            "style": "SECONDARY",
                                            "label": `Keep Remaining`,
                                            "customId": `c${commandname}downloadcustomall`,
                                            "disabled": false,
                                            "type": "BUTTON",
                                        } as MessageActionRowComponent,
                                        {
                                            "style": "SUCCESS",
                                            "label": `Keep`,
                                            "customId": `c${commandname}downloadcustomkeep`,
                                            "disabled": false,
                                            "type": "BUTTON"
                                        } as MessageActionRowComponent,
                                        {
                                            "style": "DANGER",
                                            "label": `Skip`,
                                            "customId": `c${commandname}downloadcustomskip`,
                                            "disabled": false,
                                            "type": "BUTTON"
                                        } as MessageActionRowComponent,
                                        {
                                            "style": "SECONDARY",
                                            "label": `Skip Remaining`,
                                            "customId": `c${commandname}downloadcustomnone`,
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
                                        "text": `PlaylistDJ - Video Selection - Video ${idata.index + 1}/${webpl.ytplaylist.items.length}`,
                                        "iconURL": client.user?.avatarURL() ?? ""
                                    },
                                    "url": video.url,
                                } as MessageEmbed
                            ]
                        } as InteractionUpdateOptions)
                        break;
                    }
                case `c${commandname}downloadcustomnone`:
                    for (let i = idata.index; i < webpl.ytplaylist.items.length; i++) {
                        idata.exclusions.push(i);
                    }
                case `c${commandname}downloadcustomall`:
                    if (idata?.exclusions) { webpl.remove(idata.exclusions) }
                case `c${commandname}downloadall`:
                    msg.edit({components:[]})
                    
                    if (!interaction.deferred && interaction.isRepliable()) await interaction.deferReply({ "ephemeral": true });
                    if (!interaction.guild) {error(interaction, ERRORS.NO_GUILD); return;}
                    webpl.download(interaction.guild.id)
                        .on('progress', (cur: number, total: number) => {
                            interaction.editReply(`Downloaded: ${cur}/${total} songs.`);
                        }).on('finish', (pl: Playlist | undefined) => {
                            interaction.editReply(`Success! ${pl ? pl.playlistdata.items.length : 0} files downloaded (${pl ? 'total' : 'non-fatal fail'})!`);
                        }).on('warn', (cur: number, total: number, error: Error) => {
                            interaction.editReply(`Downloaded: ${cur}/${total} songs. (Non-Fatal: ${error.message})`)
                        }).on('error', (e: Error) => {
                            interaction.editReply(`Error: ` + e.message);
                        })
                    break;
                default:
                    return interaction.update({components:[]});
            }
        }).on('end', (_,reason: string) => {
            if (reason==="idle") rctx.editReply({components:[]})
        })
    }
}
const Index: SubCommand = {
    type: "SUB_COMMAND",
    name: "index",
    description: "Lists music in the music database",
    options: [{
        "type": "STRING",
        "name": "key",
        "description": "Search filter",
        "required": false,
        choices: [
            {name:"Title",value:"title"},
            {name:"Artist",value:"artist"},
            {name:"Genre",value:"genre"}
        ]
    },{
        "type": "STRING",
        "name": "term",
        "description": "Search term",
        "required": false
    }],
    public: true,

    run: async (ctx: BaseCommandInteraction | Message) => {
        // Argument Processing
        let arg1: string | undefined = ctx instanceof BaseCommandInteraction ?
            ctx.options.get("key", false)?.value?.toString() :
            ctx.content.split(/\s+/g)[3];
        let arg2: string | undefined = ctx instanceof BaseCommandInteraction ?
            ctx.options.get("term", false)?.value?.toString() :
            ctx.content.split(/\s+/g).slice(4).join(" ");
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
        let items: Song[] = Object.values(Playlist.INDEX)
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
            }
        }
        const msg: Message = await reply(rctx, listMessage<ReplyMessageOptions>(rctx, items, page))
        // Interaction Collection
        msg.createMessageComponentCollector({
            componentType: "BUTTON",
            filter: (i: ButtonInteraction) => i.user.id===rctx.user.id,
            idle: 20*1000
        }).on('collect', (interaction: ButtonInteraction) => { 
            switch (interaction.customId) {
                case `c${commandname}indexpageup`:
                    page++;
                    break;
                case `c${commandname}indexpagedown`:
                    page--;
                    break;
                default:
                    return interaction.update({components:[]});
            }
            interaction.update(listMessage<InteractionUpdateOptions>(rctx, items, page))
        }).on('end', (_,reason: string) => {
            if (reason==="idle") rctx.editReply({components:[]})
        })
    }
}

const SubCommands: (SubCommand|SubCommandGroup)[] = [
    Amend, Auth, Clean, Destroy, Download, Index, 
]
export const Admin: Command = {
    name: commandname,
    description: "Manage global bot data.",
    options: SubCommands,
    public: true,

    run: (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        let option: string = ctx instanceof BaseCommandInteraction ? ctx.options.data[0].name : ctx.content.split(/\s+/g)[2]
        let subcommand: SubCommand | SubCommandGroup | undefined = SubCommands.find(sc => sc.name === option)

        if (!subcommand) return error(ctx, ERRORS.INVALID_ARGUMENTS);
        if (!subcommand.public && !isWhitelisted(ctx)) return error(ctx, ERRORS.NO_PERMS);
        return subcommand.run(ctx);
    },
}

function listMessage<T extends ReplyMessageOptions | InteractionUpdateOptions>(ctx: Interaction | Message, items: Song[], page: number): T {
    return {
        "content": "_",
        "components": [{
            "type": "ACTION_ROW", "components": [
                {
                    "style": "PRIMARY",
                    "label": `Prev Page`,
                    "customId": `c${commandname}indexpagedown`,
                    "disabled": page <= 0,
                    "type": "BUTTON"
                } as MessageActionRowComponent,
                {
                    "style": "PRIMARY",
                    "label": `Next Page`,
                    "customId": `c${commandname}indexpageup`,
                    "disabled": page >= Math.floor(items.length / ITEMS_PER_PAGE),
                    "type": "BUTTON"
                } as MessageActionRowComponent,
            ]
        } as MessageActionRow],
        "embeds": [{
            "type": "rich",
            "title": `All Results (${items.length})`,
            "description": "Global Music Index",
            "color": 0xff0000,
            "fields": items.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE).map(s => {
                return {
                    "name": s.title,
                    "value": s.id,
                    "inline": true,
                } as EmbedField
            }) || { "name": "No Results", "value": "Out Of Bounds", "inline": false } as EmbedField,
            "footer": {
                "text": `PlaylistDJ - Song Index - Page ${page + 1}/${Math.ceil(items.length / ITEMS_PER_PAGE)}`,
                "iconURL": client.user?.avatarURL() ?? ""
            }
        } as MessageEmbed]
    } as T
}