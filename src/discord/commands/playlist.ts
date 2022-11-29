import { ApplicationCommandOptionChoiceData, ApplicationCommandOptionType, AutocompleteInteraction, BaseInteraction, ButtonComponentData, ButtonInteraction, ButtonStyle, CommandInteraction, ComponentType, EmbedField, EmbedType } from "discord.js"
import { ERRORS, RatedSong, Song, SongReference } from "../../constants"
import { client, getArguments } from "../../index"
import * as yt from "../../web/playlist"
import { getFullSong } from "../../web/util"
import { YTPlaylist } from "../../web/ytplaylist"
import { isWhitelisted, ITEMS_PER_PAGE, truncateString } from "../util"
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

    run: (ctx: CommandInteraction, {url}: {url: string}) => {
        // Condition Validation
        if (!ctx.guild) return Promise.reject(ERRORS.NO_GUILD);
        if (yt.Playlist.getPlaylist(ctx.guild.id)) return ctx.reply({content:"This guild already has a playlist!",ephemeral:true});
        // Action Execution
        const guildid = ctx.guild.id;
        return ctx.deferReply({ephemeral: true}).then(()=>YTPlaylist.getIds(url)).then(ids => 
            yt.Playlist.create(guildid, ids)
        ).then((playlist: yt.Playlist) => {
            ctx.editReply(`Created a new playlist with ${playlist.getSongs.length} song(s)!`)
        }).catch((e: Error) => ctx.editReply(e.message))
    }
}
const Delete: SubCommand = {
    type: ApplicationCommandOptionType.Subcommand,
    name: "delete",
    description: "Deletes the server playlist.",
    public: true,

    run: (ctx: CommandInteraction) => {
        if (!ctx.guild) return Promise.reject(ERRORS.NO_GUILD);
        // Playlist Locating
        const playlist = yt.Playlist.getPlaylist(ctx.guild.id)
        if (!playlist) return ctx.reply({content:ERRORS.NO_PLAYLIST, ephemeral:true});
        // Confirmation & Action Execution
        return ctx.reply({
            content: "_",
            components: [{
                type: ComponentType.ActionRow,
                "components": [{
                    "style": ButtonStyle.Success,
                    "label": `Confirm`,
                    "customId": `cplaylistdeleteconfirm`,
                    "disabled": false,
                    "type": ComponentType.Button
                },{
                    "style": ButtonStyle.Danger,
                    "label": `Cancel`,
                    "customId": `cancel`,
                    "disabled": false,
                    "type": ComponentType.Button
                }]
            }],
            embeds: [{
                title: "Are you sure you want to delete this playlist?",
                description: "This action is permanent and irreversible.",
                color: 0xFF0000,
                footer: {
                    text: "PlaylistDJ - Confirmation Dialog",
                    icon_url: client.user?.avatarURL() ?? ""
                }
            }]
        }).then(msg=>msg.createMessageComponentCollector<ComponentType.Button>({
            filter: (i: ButtonInteraction) => i.user.id === ctx.user.id,
            time: 5 * 1000, max: 1
        }).once("collect", (interaction: ButtonInteraction): void => {
            if (interaction.customId === 'cancel') {interaction.update({ content: "Cancelled.", components: [], embeds: [] });return;}
            playlist.delete().then(()=>
                interaction.update({ content: `Deleted the playlist.`, components: [], embeds: [] })
            ).catch((e: Error) => ctx.reply({content:e.message, ephemeral:true}))
        }).on("end", (_, reason: string) => {
            if (reason === "idle"||reason==="time") ctx.deleteReply().catch();
        }));
    },
}
const Add: SubCommand = {
    type: ApplicationCommandOptionType.Subcommand,
    name: "add",
    description: "Adds music to the server playlist.",
    options: [{
        type: ApplicationCommandOptionType.String,
        name: "ids",
        description: "Song IDs to add",
        required: true,
    }],
    public: true,

    run: (ctx: CommandInteraction, {ids}: {ids: string}) => {
        if (!ctx.guild) return Promise.reject(ERRORS.NO_GUILD);
        // Playlist Locating
        let playlist = yt.Playlist.getPlaylist(ctx.guild.id)
        if (!playlist) return ctx.reply({content:ERRORS.NO_PLAYLIST, ephemeral:true});
        // Action Execution
        let added: (SongReference | null)[] = playlist.addSongs(ids.split(",").map(i => i.trim())).map(yt.Playlist.getSong);
        if (added.length < 1) return ctx.reply({content:ERRORS.NO_SONG, ephemeral:true});
        return ctx.reply({content:`Added ${added.length} song(s) to the playlist!\n> `+added
                .filter((sr: SongReference | null): sr is SongReference => !!sr)
                .map((s: Song) => truncateString(s.title, Math.floor(60/added.length))).join(", "),
            ephemeral:true
        });
    }
}
const Remove: SubCommand = {
    type: ApplicationCommandOptionType.Subcommand,
    name: "remove",
    description: "Removes music from the server playlist.",
    options: [{
        "type": ApplicationCommandOptionType.String,
        "name": "ids",
        "description": "Song IDs to remove",
        "required": true,
    }],
    public: true,

    run: (ctx: CommandInteraction, {ids}: {ids: string}) => {
        if (!ctx.guild) return Promise.reject(ERRORS.NO_GUILD);
        // Playlist Locating
        let playlist = yt.Playlist.getPlaylist(ctx.guild.id)
        if (!playlist) return ctx.reply({content:ERRORS.NO_PLAYLIST, ephemeral:true});
        // Action Execution
        let removed: (SongReference | null)[] = playlist.removeSongs(ids.split(",").map(i => i.trim())).map(yt.Playlist.getSong)
        if (removed.length < 1) return ctx.reply({content:ERRORS.NO_SONG, ephemeral:true});
        return ctx.reply({content:`Removed ${removed.length} song(s) from the playlist!\n> `+removed
                .filter((sr: SongReference | null): sr is SongReference => !!sr)
                .map((s: Song) => truncateString(s.title, Math.floor(60/removed.length))).join(", "),
            ephemeral:true,
        });
    }
}
const List: SubCommand = {
    type: ApplicationCommandOptionType.Subcommand,
    name: "list",
    description: "Lists music on server playlist",
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

    run: (ctx: CommandInteraction, {key, term}: {key: "title" | "artist" | "genre" | "tags" | "sort", term: string}) => {
        if (!ctx.guild) return Promise.reject(ERRORS.NO_GUILD);
        // Playlist Locating
        let playlist = yt.Playlist.getPlaylist(ctx.guild.id)
        if (!playlist) return ctx.reply({content:ERRORS.NO_PLAYLIST, ephemeral:true});
        // Action Execution
        let items: (SongReference & RatedSong)[] = playlist.getSongs.map(getFullSong).filter((r): r is SongReference & RatedSong => !!r)
        let page = 0;
        if (key && term) {
            term = term.toLowerCase() ?? "";
            switch (key) {
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
        // Reply & Interaction Collection
        return ctx.reply(listMessage(ctx, items, page)).then(msg=>msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: (i: ButtonInteraction) => i.user.id === ctx.user.id,
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
            interaction.update(listMessage(ctx, items, page))
        }).on('end', (_: any, reason: string) => {
            if (reason==="idle"||reason==="time") ctx.fetchReply().then(_=>ctx.editReply({components:[]})).catch()
        }))
    }
}
const Info: SubCommand = {
    type: ApplicationCommandOptionType.Subcommand,
    name: "info",
    description: "Grabs playlist statistics",
    public: true,

    run: (ctx: CommandInteraction) => {
        if (!ctx.guild) return Promise.reject(ERRORS.NO_GUILD);
        const guildid = ctx.guild.id;
        const pl = yt.Playlist.getPlaylist(guildid);
        if (!pl) return ctx.reply({content:ERRORS.NO_PLAYLIST,ephemeral:true});
        return ctx.deferReply({ephemeral:true}).then(()=>{
            const srs = pl.getSongs.map(yt.Playlist.getSong).filter((s: any): s is SongReference => !!s);
            let runtime = 0;
            for (const n of srs) {
                runtime += n.length; // expand later
            }
            return {size: srs.length, runtime};
        }).then(({size, runtime}) => ctx.editReply({
            embeds: [{
                title: `Information`,
                description: `Server Playlist`,
                fields: [
                    {name: "# Of Songs", value: ""+size, inline: true},
                    {name: "Total Song Runtime:", value: Math.round(runtime/60)+"m", inline: true},
                    {name: "Average Song Length:", value: Math.round(runtime/size)+"s", inline: true}
                ],
                footer: {
                    text: `PlaylistDJ - Server Playlist Info`,
                    icon_url: client.user?.avatarURL() ?? ""
                },
                color: 0xff0000
            }]
        }))
    }
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
        description: "Tags to set (comma seperated)",
        type: ApplicationCommandOptionType.String,
        required: true
    }],
    public: true,

    run: (ctx: CommandInteraction, {id, tags}: {id: string, tags: string}) => {
        if (!ctx.guild) return Promise.reject(ERRORS.NO_GUILD);
        const t = tags.split(",").map(s=>s.trim());
        // Playlist Locating
        const playlist = yt.Playlist.getPlaylist(ctx.guild.id)
        if (!playlist) return ctx.reply({content:ERRORS.NO_PLAYLIST, ephemeral:true});
        const song: RatedSong | undefined = playlist.getSongs.find(rs => rs.id === id)
        if (!song) return ctx.reply({content:ERRORS.NO_SONG, ephemeral:true});
        // Action Execution
        song.tags = t;
        return ctx.reply({
            "embeds": [{
                "title": "Song ID: " + song.id,
                "description": "Local Song Metadata",
                "color": 0xff0000,
                "fields": [{
                    "name": `Score:`,
                    "value": song.score.toString(),
                    "inline": true
                }, {
                    "name": `Tags:`,
                    "value": song.tags.join(", ") || "None",
                    "inline": false
                }],
                "footer": {
                    "text": `PlaylistDJ - Local Metadata Viewer`,
                    "icon_url": client.user?.avatarURL() ?? ""
                }
            }],
            ephemeral: true
        });
    },

    ac(ctx: AutocompleteInteraction) {
        if (!ctx.guild) return null;
        const playlist = yt.Playlist.getPlaylist(ctx.guild.id);
        if (!playlist || playlist.getSongs?.length < 1) return null;
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
    Create, Delete, Add, Remove, List, Info, Tag
]
export const Playlist: Command = {
    name: commandname,
    description: "Manage the server playlist.",
    options: SubCommands,
    defaultMemberPermissions: "ManageGuild",
    public: true,

    run: (ctx: CommandInteraction) => {
        if (!ctx.guild) return Promise.reject(ERRORS.NO_GUILD);
        let subcommand: SubCommand | undefined = SubCommands.find(sc => sc.name === ctx.options.data[0].name)

        if (!subcommand) return ctx.reply({content: ERRORS.INVALID_ARGUMENTS, ephemeral: true});
        if (!subcommand.public && !isWhitelisted(ctx)) return ctx.reply({content: ERRORS.NO_PERMS, ephemeral: true});
        return subcommand.run(ctx, getArguments(ctx, subcommand.options));
    },

    ac(ctx: AutocompleteInteraction) {
        if (!ctx.guild || !yt.Playlist.getPlaylist(ctx.guild.id)) return null; // No Playlist, not an error
        let command: SubCommand | undefined | null = SubCommands.find(c=>c.name===ctx.options.data[0].name);
        if (!command?.ac) return new Error("Autocomplete not recognized.");
    
        return command.ac(ctx);
    }
}

function listMessage(ctx: BaseInteraction, items: Song[], page: number) {
    if (!ctx.guild) return { content: "Couldn't find guild!" };
    return {
        "content": "_",
        "components": [{
            "type": ComponentType.ActionRow, "components": [{
                "style": ButtonStyle.Primary,
                "label": `Prev Page`,
                "customId": `c${commandname}listpagedown`,
                "disabled": page <= 0,
                "type": ComponentType.Button
            } as ButtonComponentData, {
                "style": ButtonStyle.Primary,
                "label": `Next Page`,
                "customId": `c${commandname}listpageup`,
                "disabled": page >= Math.floor(items.length / ITEMS_PER_PAGE),
                "type": ComponentType.Button
            } as ButtonComponentData]
        }],
        "embeds": [{
            "type": EmbedType.Rich,
            "title": `All Results (${items.length})`,
            "description": `${ctx.guild.name.length > 20 ? ctx.guild.nameAcronym : ctx.guild.name} Server Playlist`,
            "color": 0xff0000,
            "fields": items.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE).map(s => {
                return {
                    "name": s.title,
                    "value": s.id,
                    "inline": true,
                }
            }) || { "name": "No Results", "value": "Out Of Bounds", "inline": false } as EmbedField,
            "footer": {
                "text": `PlaylistDJ - Song List - Page ${page + 1}/${Math.ceil(items.length / ITEMS_PER_PAGE)}`,
                "icon_url": client.user?.avatarURL() ?? ""
            }
        }],
        ephemeral: true
    }
}