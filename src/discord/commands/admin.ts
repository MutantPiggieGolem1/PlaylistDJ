import { CommandInteraction, Message, ReplyMessageOptions, ButtonInteraction, InteractionUpdateOptions, EmbedField, MessageActionRowComponent, ActionRow, Embed, MessageOptions, User, ModalSubmitInteraction, TextInputComponent, ModalData, AutocompleteInteraction, ApplicationCommandOptionChoiceData, ButtonStyle, ComponentType, ApplicationCommandOptionType, ActionRowComponent, ModalComponentData, ModalActionRowComponentData, TextInputStyle, ModalActionRowComponent, ActionRowModalData, TextInputModalData } from "discord.js";
import { client, WHITELIST } from "../../index";
import { Playlist, WebPlaylist } from "../../youtube/playlist";
import { SongReference, Genre, Song } from "../../youtube/util";
import { error, ERRORS, editReply, isWhitelisted, reply, ITEMS_PER_PAGE } from "../util";
import { Command, SubCommand, SubCommandGroup } from "./Commands";

const commandname = "admin"

const Amend: SubCommand = {
    type: ApplicationCommandOptionType.Subcommand,
    name: "amend",
    description: "Modifies music metadata in the music database.",
    options: [{
        name: "id",
        description: "Song ID to edit",
        type: ApplicationCommandOptionType.String,
        required: true,
        autocomplete: true,
    }],
    public: false,

    run: async (ctx: CommandInteraction | Message) => {
        if (!ctx.guild) return;
        // Argument Processing
        const id: string | undefined = ctx instanceof CommandInteraction ?
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
                    type: ComponentType.ActionRow,
                    components: [{
                        "style": ButtonStyle.Success,
                        "label": `Continue`,
                        "customId": `continue`,
                        "disabled": false,
                        "type": ComponentType.Button,
                    } as MessageActionRowComponent]
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
        rctx.showModal({
            customId: `c${commandname}amendedit`,
            title: `Song Metadata Editor [${song.id}]`,
            components: [{
                type: ComponentType.ActionRow,
                components: [{
                    customId: `mamendedittitle`,
                    label: "Song Title:",
                    maxLength: 64,
                    placeholder: song.title,
                    required: false,
                    style: TextInputStyle.Short,
                    type: ComponentType.TextInput
                } as ModalActionRowComponentData]
            } as ActionRow<ModalActionRowComponent>,{
                type: ComponentType.ActionRow,
                components: [{
                    customId: `mamendeditartist`,
                    label: "Song Artist:",
                    maxLength: 32,
                    placeholder: song.artist,
                    required: false,
                    style: TextInputStyle.Short,
                    type: ComponentType.TextInput
                } as ModalActionRowComponentData]
            } as ActionRow<ModalActionRowComponent>,{
                type: ComponentType.ActionRow,
                components: [{
                    customId: `mamendeditgenre`,
                    label: "Song Genre:",
                    maxLength: 16,
                    placeholder: song.genre.toString(),
                    required: false,
                    style: TextInputStyle.Short,
                    type: ComponentType.TextInput
                } as ModalActionRowComponentData]
            } as ActionRow<ModalActionRowComponent>]
        } as ModalComponentData).then(async _=> {
            if (ctx instanceof Message && await rctx.fetchReply()) await rctx.deleteReply()
            return rctx.awaitModalSubmit({time:5*60*1000})
        }).then(async (interaction: ModalSubmitInteraction) => {
            let content: string = "_";
            song.title = interaction.fields.getTextInputValue(`mamendedittitle`) || song.title
            song.artist= interaction.fields.getTextInputValue(`mamendeditartist`)|| song.artist
            let genre = interaction.fields.getTextInputValue(`mamendeditgenre`)
            if (genre) {
                if (Object.keys(Genre).includes(genre)) {
                    song.genre = <Genre>(<any>Genre)[genre];
                } else {
                    content = `Couldn't identify genre '${genre}'!`
                }
            }
            await Playlist.setMusicIndex()
            return interaction.reply({
                ephemeral: true,
                content,
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

    ac(ctx: AutocompleteInteraction): ApplicationCommandOptionChoiceData[] {
        const focused = ctx.options.getFocused().toString();
        if (focused.length <= 0) return []; // too many matches, don't bother
        return Object.values(Playlist.INDEX)
            .filter(k=>k.id.startsWith(focused))
            .map(o=>{
                return {name:o.title,value:o.id} as ApplicationCommandOptionChoiceData
            })
    }
}
const Auth: SubCommandGroup = {
    name: "auth",
    description: "Modifies users with administrator privileges.",
    type: ApplicationCommandOptionType.SubcommandGroup,
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

    run: (ctx: CommandInteraction | Message) => {
        if (!ctx.guild) return
        if (ctx.member?.user.id !== "547624574070816799") return error(ctx,ERRORS.NO_PERMS)
        let user: User | undefined, option: string
        if (ctx instanceof CommandInteraction) {
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
                                "icon_url": client.user?.avatarURL() ?? ""
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
    type: ApplicationCommandOptionType.Subcommand,
    name: "clean",
    description: "Deletes unreferenced files globally.",
    public: false,

    run: (ctx: CommandInteraction | Message) => {
        Playlist.clean()
            // .on('progress', async (message: string) => {
            //     // await editReply(ctx, message) // 
            // }) Interaction already responded or something
            .once('finish', (files: string[], rmfiles: string[]) => {
                reply(ctx, `Clean Complete! Deleted ${rmfiles.length} files, ${files.length} files remaining!`)
            }).on('error', async (e: Error) => { error(ctx, e) })
    }
}
const Destroy: SubCommand = {
    type: ApplicationCommandOptionType.Subcommand,
    name: "destroy",
    description: "Deletes music from the filesystem.",
    public: false,
    options: [{
        name: "id",
        description: "Song ID(s) to delete",
        type: ApplicationCommandOptionType.String,
        required: true,
    }],

    run: async (ctx: CommandInteraction | Message) => {
        if (!ctx.guild) return;
        // Argument Processing
        let inp: string | undefined = ctx instanceof CommandInteraction
            ? ctx.options.get("id",true).value?.toString()
            : ctx.content.split(/\s+/g)[3]
        if (!inp) return error(ctx, ERRORS.INVALID_ARGUMENTS);
        let ids: string[] = inp.split(",").slice(undefined,10).map(id=>id.trim())
        if (ids.length <= 0) return error(ctx, ERRORS.INVALID_ARGUMENTS);
        // Action Execution
        let removed: string[] = await Playlist.delete(ids);
        if (removed.length < 1) return error(ctx, ERRORS.NO_SONG);
        await reply(ctx,`Success! Destroyed ${removed.length} song(s).`)
    }
}
const Download: SubCommand = {
    type: ApplicationCommandOptionType.Subcommand,
    name: "download",
    description: "Downloads music from youtube.",
    options: [{
        "type": ApplicationCommandOptionType.String,
        name: "url",
        description: "Youtube URL to Download From",
        required: true,
    }],
    public: false,

    run: async (ctx: CommandInteraction | Message) => {
        if (!ctx.guild) return;
        // Argument Processing
        let arg1: string | null | undefined = ctx instanceof CommandInteraction ?
            ctx.options.get("url", true).value?.toString() :
            ctx.content.split(/\s+/g)[3]
        if (!arg1) return error(ctx, ERRORS.INVALID_ARGUMENTS);
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
                    } as MessageActionRowComponent]
                }]
            }, true)
        }
        const rctx: ButtonInteraction | CommandInteraction | void = ctx instanceof Message ? (await rmsg?.awaitMessageComponent({
            componentType: ComponentType.Button,
            filter: (i: ButtonInteraction) => i.user.id===ctx.author.id,
            time: 10*1000
        }).catch(_=>{if (rmsg?.deletable) rmsg.delete()})) : ctx
        if (!rctx?.guild) return;
        if (rmsg?.deletable) await rmsg.delete()
        // Playlist Locating
        await rctx.reply({content: "Searching for Playlist...", ephemeral: true})
        try {
            var webpl: WebPlaylist = await WebPlaylist.fromUrl(arg1);
        } catch (e) { return error(rctx, e as Error) }
        // Action Execution
        const guildid: string = rctx.guild?.id;
        const idata: {index: number, exclusions: number[]} = { index: 0, exclusions: [] };
        const msg: Message = (await rctx.editReply({
            ephemeral: true,
            "content": "Found!",
            "components": [
                {
                    "type": ComponentType.ActionRow,
                    "components": [
                        {
                            "style": ButtonStyle.Primary,
                            "label": `Custom Download`,
                            "customId": `c${commandname}downloadcustom`,
                            "disabled": webpl.ytplaylist.items.length <= 1,
                            "type": ComponentType.Button,
                        } as ActionRowComponent,
                        {
                            "style": ButtonStyle.Success,
                            "label": `Download All`,
                            "customId": `c${commandname}downloadall`,
                            "disabled": false,
                            "type": ComponentType.Button,
                        } as ActionRowComponent,
                    ]
                } as ActionRow<ActionRowComponent>
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
                        "icon_url": webpl.ytplaylist.author.bestAvatar.url,
                        "url": webpl.ytplaylist.author.url
                    } : { "name": "Unknown Author" },
                    "footer": {
                        "text": `PlaylistDJ - Playlist Download`,
                        "icon_url": client.user?.avatarURL() ?? ""
                    },
                    "url": webpl.ytplaylist.url,
                } as Partial<Embed>
            ]
        } as MessageOptions) as Message)
        // Interaction Collection
        msg.createMessageComponentCollector<ComponentType.Button>({
            filter: (i: ButtonInteraction) => i.user.id===rctx.user.id,
            idle: 20*1000
        }).on('collect', async (interaction: ButtonInteraction): Promise<void> => {
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
                                    "type": ComponentType.ActionRow,
                                    "components": [
                                        {
                                            "style": ButtonStyle.Secondary,
                                            "label": `Keep Remaining`,
                                            "customId": `c${commandname}downloadcustomall`,
                                            "disabled": false,
                                            "type": ComponentType.Button,
                                        } as ActionRowComponent,
                                        {
                                            "style": ButtonStyle.Success,
                                            "label": `Keep`,
                                            "customId": `c${commandname}downloadcustomkeep`,
                                            "disabled": false,
                                            "type": ComponentType.Button
                                        } as ActionRowComponent,
                                        {
                                            "style": ButtonStyle.Danger,
                                            "label": `Skip`,
                                            "customId": `c${commandname}downloadcustomskip`,
                                            "disabled": false,
                                            "type": ComponentType.Button
                                        } as ActionRowComponent,
                                        {
                                            "style": ButtonStyle.Secondary,
                                            "label": `Skip Remaining`,
                                            "customId": `c${commandname}downloadcustomnone`,
                                            "disabled": false,
                                            "type": ComponentType.Button,
                                        } as ActionRowComponent,
                                    ]
                                } as ActionRow<ActionRowComponent>
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
                                        "icon_url": client.user?.avatarURL() ?? ""
                                    },
                                    "url": video.url,
                                } as Partial<Embed>
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
                    if (!interaction.deferred && !interaction.replied) await interaction.update({components: [], embeds: [], content: "Downloading..."});
                    webpl.download(guildid)
                    .on('progress', (cur: number, total: number, id: string) => {
                        editReply(interaction, `Downloaded: ${cur}/${total} songs. [Current: \`${id}\`]`);
                    }).on('warn', (cur: number, total: number, id: string, error: Error) => {
                        editReply(interaction, `Downloaded: ${cur}/${total} songs. [Current: \`${id}\`] (Non-Fatal: ${error.message})`)
                    }).on('finish', (pl: Playlist | undefined) => {
                        editReply(interaction, `Success! Your playlist now has ${pl ? pl.playlistdata.items.length : 0} songs downloaded (${pl ? 'total' : 'non-fatal fail'})!`);
                    }).on('error', (e: Error) => {
                        editReply(interaction, "Error: " + e.message);
                    })
                    break;
                default:
                    interaction.update({components:[]}); return;
            }
        }).on('end', (_,reason: string) => {
            if (reason==="idle") rctx.fetchReply().then(_=>rctx.editReply({components:[]})).catch()
        })
    }
}
const Index: SubCommand = {
    type: ApplicationCommandOptionType.Subcommand,
    name: "index",
    description: "Lists music in the music database",
    options: [{
        "type": ApplicationCommandOptionType.String,
        "name": "key",
        "description": "Search filter",
        "required": false,
        choices: [
            {name:"Title",value:"title"},
            {name:"Artist",value:"artist"},
            {name:"Genre",value:"genre"}
        ]
    },{
        "type": ApplicationCommandOptionType.String,
        "name": "term",
        "description": "Search term",
        "required": false
    }],
    public: true,

    run: async (ctx: CommandInteraction | Message) => {
        // Argument Processing
        let arg1: string | undefined = ctx instanceof CommandInteraction ?
            ctx.options.get("key", false)?.value?.toString() :
            ctx.content.split(/\s+/g)[3];
        let arg2: string | undefined = ctx instanceof CommandInteraction ?
            ctx.options.get("term", false)?.value?.toString() :
            ctx.content.split(/\s+/g).slice(4).join(" ");
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
                    } as MessageActionRowComponent]
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
        const msg: Message = await reply(rctx, listMessage<ReplyMessageOptions>(items, page), true)
        // Interaction Collection
        msg.createMessageComponentCollector<ComponentType.Button>({
            filter: (i: ButtonInteraction) => i.user.id===rctx.user.id,
            idle: 20*1000
        }).on('collect', (interaction: ButtonInteraction): void => { 
            switch (interaction.customId) {
                case `c${commandname}indexpageup`:
                    page++;
                    break;
                case `c${commandname}indexpagedown`:
                    page--;
                    break;
                default:
                    interaction.update({components:[]}); return;
            }
            interaction.update(listMessage<InteractionUpdateOptions>(items, page))
        }).on('end', (_,reason: string) => {
            if (reason==="idle") rctx.fetchReply().then(_=>rctx.editReply({components:[]})).catch()
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
    defaultMemberPermissions: "Administrator",
    public: true,

    run: (ctx: CommandInteraction | Message) => {
        if (!ctx.guild) return;
        let option: string = ctx instanceof CommandInteraction ? ctx.options.data[0].name : ctx.content.split(/\s+/g)[2]
        let subcommand: SubCommand | SubCommandGroup | undefined = SubCommands.find(sc => sc.name === option)

        if (!subcommand) return error(ctx, ERRORS.INVALID_ARGUMENTS);
        if (!subcommand.public && !isWhitelisted(ctx)) return error(ctx, ERRORS.NO_PERMS);
        return subcommand.run(ctx);
    },

    ac: (ctx: AutocompleteInteraction) => {
        let command: SubCommand | SubCommandGroup | undefined | null = SubCommands.find(c=>c.name===ctx.options.data[0].name);
        if (!command?.ac) return new Error("Autocomplete not recognized.");
    
        return command.ac(ctx);
    }
}

function listMessage<T extends ReplyMessageOptions | InteractionUpdateOptions>(items: Song[], page: number): T {
    return {
        "content": "_",
        "components": [{
            "type": ComponentType.ActionRow, "components": [
                {
                    "style": ButtonStyle.Primary,
                    "label": `Prev Page`,
                    "customId": `c${commandname}indexpagedown`,
                    "disabled": page <= 0,
                    "type": ComponentType.Button
                } as ActionRowComponent,
                {
                    "style": ButtonStyle.Primary,
                    "label": `Next Page`,
                    "customId": `c${commandname}indexpageup`,
                    "disabled": page >= Math.floor(items.length / ITEMS_PER_PAGE),
                    "type": ComponentType.Button
                } as ActionRowComponent,
            ]
        } as ActionRow<ActionRowComponent>],
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
                "icon_url": client.user?.avatarURL() ?? ""
            }
        } as Partial<Embed>]
    } as T
}