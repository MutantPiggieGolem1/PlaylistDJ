import { ApplicationCommandOptionChoiceData, ApplicationCommandOptionType, AttachmentBuilder, AutocompleteInteraction, ButtonComponentData, ButtonInteraction, ButtonStyle, CommandInteraction, ComponentType, EmbedType, ModalSubmitInteraction, TextInputStyle } from "discord.js"
import { ERRORS, Genre, maxLengths, Song, SongReference } from "../../constants"
import { client, getArguments } from "../../index"
import { getAllCsvs, getCsv, getFileSizeMiB } from "../../recommendation/interface"
import { Playlist } from "../../web/playlist"
import { YTPlaylist } from "../../web/ytplaylist"
import { isWhitelisted, ITEMS_PER_PAGE, longestGenre } from "../util"
import { Command, SubCommand } from "./Commands"

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

    run: (ctx: CommandInteraction, {id}: {id: string}) => {
        if (!ctx.guild) return Promise.reject(ERRORS.NO_GUILD);
        // Playlist Locating (ish)
        const song: SongReference | null = Playlist.getSong(id);
        if (!song) return ctx.reply({content:ERRORS.NO_SONG,ephemeral:true});
        // Action Execution
        return ctx.showModal({
            customId: `c${commandname}amendedit`,
            title: `Song Metadata Editor [${song.id}]`,
            components: [{
                type: ComponentType.ActionRow,
                components: [{
                    customId: `mamendedittitle`,
                    label: "Song Title:",
                    maxLength: maxLengths.title,
                    placeholder: song.title,
                    required: false,
                    style: TextInputStyle.Short,
                    type: ComponentType.TextInput
                }]
            },{
                type: ComponentType.ActionRow,
                components: [{
                    customId: `mamendeditartist`,
                    label: "Song Artist:",
                    maxLength: maxLengths.artist,
                    placeholder: song.artist,
                    required: false,
                    style: TextInputStyle.Short,
                    type: ComponentType.TextInput
                }]
            },{
                type: ComponentType.ActionRow,
                components: [{
                    customId: `mamendeditreleaseYear`,
                    label: "Release Year:",
                    maxLength: 4,
                    placeholder: song.releaseYear.toString(),
                    required: false,
                    style: TextInputStyle.Short,
                    type: ComponentType.TextInput
                }]
            },{
                type: ComponentType.ActionRow,
                components: [{
                    customId: `mamendeditgenre`,
                    label: "Song Genre:",
                    maxLength: longestGenre,
                    placeholder: song.genre.toString(),
                    required: false,
                    style: TextInputStyle.Short,
                    type: ComponentType.TextInput
                }]
            }]
        }).then(() => ctx.awaitModalSubmit({time:5*60*1000})).then((interaction: ModalSubmitInteraction) => {
            let content = "Updated!";
            song.title = interaction.fields.getTextInputValue(`mamendedittitle`) || song.title
            song.artist= interaction.fields.getTextInputValue(`mamendeditartist`)|| song.artist
            let yr = interaction.fields.getTextInputValue(`mamendeditreleaseYear`);
            if (yr) {
                if (Number(yr) > 0) {
                    song.releaseYear = Number(yr);
                } else {
                    content += ` Couldn't parse year '${yr}'!`
                }
            }
            let genre = interaction.fields.getTextInputValue(`mamendeditgenre`)
            if (genre) {
                if (Object.keys(Genre).includes(genre)) {
                    song.genre = <Genre>(<any>Genre)[genre];
                } else {
                    content += ` Couldn't identify genre '${genre}'!`
                }
            }
            return Playlist.save().then(()=>interaction.reply({
                ephemeral: true, content,
                "embeds": [{
                    "title": "Song ID: " + song.id,
                    "description": "Song Metadata",
                    "color": 0xff0000,
                    "fields": [{
                        "name": `Title:`,
                        "value": song.title,
                        "inline": true
                    }, {
                        "name": `Artist:`,
                        "value": song.artist,
                        "inline": true
                    }, {
                        name: `Release Year:`,
                        value: song.releaseYear.toString(),
                        inline: true
                    }, {
                        "name": `Genre:`,
                        "value": song.genre.toString(),
                        "inline": true
                    }],
                    "footer": {
                        "text": `PlaylistDJ - Global Metadata Viewer`,
                        "icon_url": client.user?.avatarURL() ?? ""
                    },
                    "url": song.url
                }]
            }));
        }).catch(() => {}); // ignore unsubmitted modals
    },

    ac(ctx: AutocompleteInteraction): ApplicationCommandOptionChoiceData[] {
        const focused = ctx.options.getFocused();
        if (focused.length <= 0) return []; // too many matches, don't bother
        return Object.values(Playlist.getSong())
            .filter(k=>k.id.startsWith(focused))
            .map(o=>{return {name:o.title,value:o.id}})
    }
}
const Clean: SubCommand = {
    type: ApplicationCommandOptionType.Subcommand,
    name: "clean",
    description: "Deletes unreferenced files globally.",
    public: false,

    run: (ctx: CommandInteraction) =>
        Playlist.clean().then((rmfiles: string[]) =>ctx.reply(
            {content:`Clean Complete! [Deleted ${rmfiles.length} files]`,ephemeral:true}
        ))
}
const Destroy: SubCommand = {
    type: ApplicationCommandOptionType.Subcommand,
    name: "destroy",
    description: "Deletes music from the filesystem.",
    public: false,
    options: [{
        name: "ids",
        description: "Song ID(s) to delete",
        type: ApplicationCommandOptionType.String,
        required: true,
    }],

    run: (ctx: CommandInteraction, {ids}: {ids: string}) => {
        if (!ctx.guild) return Promise.reject(ERRORS.NO_GUILD);
        return Playlist.delete(ids.split(",").map(id=>id.trim())).then((removed) => removed.length < 1
            ? ctx.reply({content: ERRORS.NO_SONG, ephemeral: true})
            : ctx.reply({content:`Success! Destroyed ${removed.length} song(s).`, ephemeral:true})
        )
    }
}
const Download: SubCommand = {
    type: ApplicationCommandOptionType.Subcommand,
    name: "download",
    description: "Downloads music from youtube.",
    options: [{
        type: ApplicationCommandOptionType.String,
        name: "url",
        description: "Youtube URL to Download From",
        required: true,
    }],
    public: false,

    run: async (ctx: CommandInteraction, {url}: {url: string}) => {
        if (!ctx.guild) return Promise.reject(ERRORS.NO_GUILD);
        const guildid = ctx.guild.id;
        // Playlist Locating
        await ctx.reply({content: "Searching for Playlist...",ephemeral:true});
        try {
            var webpl = await YTPlaylist.fromUrl(url);
        } catch (e) { return ctx.reply({content:(e as Error).message,ephemeral:true}) }
        // Action Execution
        const idata: {index: number, exclusions: number[]} = { index: 0, exclusions: [] };
        return ctx.editReply({
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
                        },
                        {
                            "style": ButtonStyle.Success,
                            "label": `Download All`,
                            "customId": `c${commandname}downloadall`,
                            "disabled": false,
                            "type": ComponentType.Button,
                        },
                    ]
                }
            ],
            "embeds": [
                {
                    type: EmbedType.Rich,
                    title: `${webpl.ytplaylist.title} - ${webpl.ytplaylist.estimatedItemCount} Items`,
                    description: webpl.ytplaylist.description ?? undefined,
                    color: 0xFF0000,
                    "image": {
                        "url": webpl.ytplaylist.bestThumbnail.url ?? "",
                        "height": webpl.ytplaylist.bestThumbnail.height,
                        "width": webpl.ytplaylist.bestThumbnail.width
                    },
                    "author": webpl.ytplaylist.author ? {
                        "name": webpl.ytplaylist.author.name,
                        "icon_url": webpl.ytplaylist.author.bestAvatar.url ?? undefined,
                        "url": webpl.ytplaylist.author.url
                    } : { "name": "Unknown Author" },
                    "footer": {
                        "text": `PlaylistDJ - Playlist Download`,
                        "icon_url": client.user?.avatarURL() ?? ""
                    },
                    "url": webpl.ytplaylist.url,
                }
            ]
        }).then(msg => {
            msg.createMessageComponentCollector<ComponentType.Button>({
                filter: (i: ButtonInteraction) => i.user.id===ctx.user.id,
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
                                        "type": ComponentType.ActionRow,
                                        "components": [
                                            {
                                                "style": ButtonStyle.Secondary,
                                                "label": `Keep Remaining`,
                                                "customId": `c${commandname}downloadcustomall`,
                                                "disabled": false,
                                                "type": ComponentType.Button,
                                            },
                                            {
                                                "style": ButtonStyle.Success,
                                                "label": `Keep`,
                                                "customId": `c${commandname}downloadcustomkeep`,
                                                "disabled": false,
                                                "type": ComponentType.Button
                                            },
                                            {
                                                "style": ButtonStyle.Danger,
                                                "label": `Skip`,
                                                "customId": `c${commandname}downloadcustomskip`,
                                                "disabled": false,
                                                "type": ComponentType.Button
                                            },
                                            {
                                                "style": ButtonStyle.Secondary,
                                                "label": `Skip Remaining`,
                                                "customId": `c${commandname}downloadcustomnone`,
                                                "disabled": false,
                                                "type": ComponentType.Button,
                                            },
                                        ]
                                    }
                                ],
                                "embeds": [
                                    {
                                        type: EmbedType.Rich,
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
                                    }
                                ]
                            })
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
                        let startingLength: number = 0;
                        webpl.download(guildid)
                        .on('start', (songs: SongReference[]) => {
                            startingLength = songs.length;
                        }).on('progress', (cur: number, total: number, id: string) => {
                            interaction.editReply(`Downloaded: ${cur}/${total} songs. [Current: \`${id}\`]`);
                        }).on('warn', (cur: number, total: number, id: string, error: Error) => {
                            interaction.editReply(`Downloaded: ${cur}/${total} songs. [Current: \`${id}\`] (Non-Fatal: ${error.message})`)
                        }).on('finish', (pl: Playlist) => {
                            interaction.editReply(`Success! Downloaded ${pl.getSongs.length-startingLength} songs!`);
                        }).on('error', (e: Error) => interaction.editReply("Error: " + e.message))
                        break;
                    default:
                        interaction.update({components:[]}); return;
                }
            }).on('end', (_,reason: string) => {
                if (reason==="idle"||reason==="time") ctx.editReply({components:[]}).catch()
            })
        }).catch((e: Error) => {ctx.reply({content:e.message,ephemeral:true})});
    }
}
const Index: SubCommand = {
    type: ApplicationCommandOptionType.Subcommand,
    name: "index",
    description: "Lists music in the music database",
    public: true,
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

    run: (ctx: CommandInteraction, {key, term}: {key?: "title" | "artist" | "genre", term?: string}) => {
        // Action Execution
        let items: Song[] = Object.values(Playlist.getSong())
        let page = 0;
        if (key && term) {
            const t = term.toLowerCase();
            switch (key) {
                case 'title':
                    items = items.filter((i: Song) => i.title.toLowerCase().includes(t));
                    break;
                case 'artist':
                    items = items.filter((i: Song) => i.artist.toLowerCase().includes(t));
                    break;
                case 'genre':
                    items = items.filter((i: Song) => i.genre.toString().toLowerCase() === term);
                    break;
            }
        }
        // Reply & Interaction Collection
        return ctx.reply(listMessage(items, page)).then(msg=>
            msg.createMessageComponentCollector<ComponentType.Button>({
                filter: (i: ButtonInteraction) => i.user.id===ctx.user.id,
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
                        interaction.update({components:[]});
                        return;
                }
                interaction.update(listMessage(items, page))
            }).on('end', (_,reason: string) => {
                if (reason==="idle"||reason==="time") ctx.editReply({components:[]}).catch()
            })
        );
    }
}
const Info: SubCommand = {
    type: ApplicationCommandOptionType.Subcommand,
    name: "info",
    description: "Grabs database statistics",
    public: true,

    run: (ctx: CommandInteraction) => 
        ctx.deferReply({ephemeral:true}).then(async ()=>{
            let runtime = 0, size = 0;
            for (const n of Object.values(Playlist.getSong())) {
                runtime += n.length; // expand later
                size += await getFileSizeMiB(n.file);
            }
            return {length: Object.keys(Playlist.getSong()).length, runtime, size, version: require("../../../package.json")["version"]};
        }).then(({length, runtime, size, version}) => ctx.editReply({
            embeds: [{
                title: `Information`,
                description: `Global Music Index`,
                fields: [
                    {name: "# Of Songs", value: ""+length, inline: true},
                    {name: "Total Song Runtime:", value: Math.round(runtime/60)+"m", inline: true},
                    {name: "Average Song Length:", value: Math.round(runtime/length)+"s", inline: true},
                    {name: "Total Size:", value: Math.round(size)+"MiB", inline: false}
                ],
                footer: {
                    text: `PlaylistDJ v${version} - Song Index Info`,
                    icon_url: client.user?.avatarURL() ?? ""
                },
                color: 0xff0000
            }]
        }))
}
const GrabCSV: SubCommand = {
    type: ApplicationCommandOptionType.Subcommand,
    name: "grabcsv",
    description: "Gets the most recent CSV data of a guild.",
    public: false,
    options: [{
        type: ApplicationCommandOptionType.String,
        name: "id",
        description: "Guild ID",
        required: true,
        autocomplete: true
    }, {
        type: ApplicationCommandOptionType.Boolean,
        name: "public",
        description: "Allow anyone to download this file?",
        required: false
    }],

    run: (ctx: CommandInteraction) => {
        const gid: string | undefined = ctx.options.get("id", true).value?.toString();
        const ephemeral: boolean = !(ctx.options.get("public", false)?.value ?? false);
        if (!gid) return ctx.reply({content: ERRORS.INVALID_ARGUMENTS, ephemeral: true});
        const file: Buffer | null = getCsv(gid);
        if (!file) return ctx.reply({content:"Couldn't find data!",ephemeral:true});
        return ctx.reply({
            content: "-",
            files: [new AttachmentBuilder(file, {name: gid+".csv", description:`CSV Data for '${client.guilds.cache.get(gid)?.name}'`})],
            ephemeral,
        });
    },

    ac(ctx: AutocompleteInteraction): ApplicationCommandOptionChoiceData[] {
        const focused = ctx.options.getFocused().toString();
        if (!focused) return [];
        return getAllCsvs()?.filter(s => s.startsWith(focused)).map(s => {return {name: client.guilds.cache.get(s)?.name ?? s, value: s}}) || [{name: "Index", value: "0"}];
    }
}

const SubCommands: SubCommand[] = [
    Amend, Clean, Destroy, Download, Index, Info, GrabCSV
]
export const Admin: Command = {
    name: commandname,
    description: "Manage global bot data.",
    options: SubCommands,
    public: true,

    run: (ctx: CommandInteraction) => {
        if (!ctx.guild) return Promise.reject(ERRORS.NO_GUILD);
        let subcommand: SubCommand | undefined = SubCommands.find(sc => sc.name === ctx.options.data[0].name)

        if (!subcommand) return ctx.reply({content: ERRORS.INVALID_ARGUMENTS, ephemeral: true});
        if (!subcommand.public && !isWhitelisted(ctx)) return ctx.reply({content: ERRORS.NO_PERMS, ephemeral: true});
        return subcommand.run(ctx, getArguments(ctx, subcommand.options));
    },

    ac(ctx: AutocompleteInteraction) {
        let command: SubCommand | undefined = SubCommands.find(c=>c.name===ctx.options.data[0].name);
        if (!command?.ac) return new Error("Autocomplete not recognized.");
    
        return command.ac(ctx);
    }
}

function listMessage(items: Song[], page: number) {
    return {
        "components": [{
            type: ComponentType.ActionRow,
            components: [{
                "style": ButtonStyle.Primary,
                "label": `Prev Page`,
                "customId": `c${commandname}indexpagedown`,
                "disabled": page <= 0,
                type: ComponentType.Button
            } as ButtonComponentData, {
                "style": ButtonStyle.Primary,
                "label": `Next Page`,
                "customId": `c${commandname}indexpageup`,
                "disabled": page >= Math.floor(items.length / ITEMS_PER_PAGE),
                type: ComponentType.Button
            } as ButtonComponentData]
        }],
        "embeds": [{
            type: EmbedType.Rich,
            "title": `All Results (${items.length})`,
            "description": "Global Music Index",
            "color": 0xff0000,
            "fields": items.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE).map(s => {
                return {
                    "name": s.title,
                    "value": s.id,
                    "inline": true,
                }
            }) || { "name": "No Results", "value": "Out Of Bounds", "inline": false },
            "footer": {
                "text": `PlaylistDJ - Song Index - Page ${page + 1}/${Math.ceil(items.length / ITEMS_PER_PAGE)}`,
                "icon_url": client.user?.avatarURL() ?? ""
            }
        }],
        ephemeral: true
    }
}