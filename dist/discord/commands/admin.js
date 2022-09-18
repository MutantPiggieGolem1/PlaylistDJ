"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Admin = void 0;
const discord_js_1 = require("discord.js");
const index_1 = require("../../index");
const interface_1 = require("../../recommendation/interface");
const playlist_1 = require("../../youtube/playlist");
const util_1 = require("../../youtube/util");
const util_2 = require("../util");
const commandname = "admin";
const Amend = {
    type: discord_js_1.ApplicationCommandOptionType.Subcommand,
    name: "amend",
    description: "Modifies music metadata in the music database.",
    options: [{
            name: "id",
            description: "Song ID to edit",
            type: discord_js_1.ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true,
        }],
    public: false,
    run: async (ctx) => {
        if (!ctx.guild)
            return;
        const id = ctx instanceof discord_js_1.CommandInteraction ?
            ctx.options.get("id", true).value?.toString() :
            ctx.content.split(/\s+/g)[3];
        if (!id)
            return (0, util_2.error)(ctx, util_2.ERRORS.INVALID_ARGUMENTS);
        const song = playlist_1.Playlist.INDEX[id];
        if (!song)
            return (0, util_2.error)(ctx, util_2.ERRORS.NO_SONG);
        let rmsg;
        if (ctx instanceof discord_js_1.Message) {
            rmsg = await (0, util_2.reply)(ctx, {
                "content": "Click this button to continue:",
                "components": [{
                        type: discord_js_1.ComponentType.ActionRow,
                        components: [{
                                "style": discord_js_1.ButtonStyle.Success,
                                "label": `Continue`,
                                "customId": `continue`,
                                "disabled": false,
                                "type": discord_js_1.ComponentType.Button,
                            }]
                    }]
            }, true);
        }
        const rctx = ctx instanceof discord_js_1.Message ? (await rmsg?.awaitMessageComponent({
            componentType: discord_js_1.ComponentType.Button,
            filter: (i) => i.user.id === ctx.author.id,
            time: 10 * 1000
        }).catch(_ => { if (rmsg?.deletable)
            rmsg.delete(); })) : ctx;
        if (!rctx)
            return;
        if (rmsg?.deletable)
            await rmsg.delete();
        rctx.showModal({
            customId: `c${commandname}amendedit`,
            title: `Song Metadata Editor [${song.id}]`,
            components: [{
                    type: discord_js_1.ComponentType.ActionRow,
                    components: [{
                            customId: `mamendedittitle`,
                            label: "Song Title:",
                            maxLength: 64,
                            placeholder: song.title,
                            required: false,
                            style: discord_js_1.TextInputStyle.Short,
                            type: discord_js_1.ComponentType.TextInput
                        }]
                }, {
                    type: discord_js_1.ComponentType.ActionRow,
                    components: [{
                            customId: `mamendeditartist`,
                            label: "Song Artist:",
                            maxLength: 32,
                            placeholder: song.artist,
                            required: false,
                            style: discord_js_1.TextInputStyle.Short,
                            type: discord_js_1.ComponentType.TextInput
                        }]
                }, {
                    type: discord_js_1.ComponentType.ActionRow,
                    components: [{
                            customId: `mamendeditgenre`,
                            label: "Song Genre:",
                            maxLength: 16,
                            placeholder: song.genre.toString(),
                            required: false,
                            style: discord_js_1.TextInputStyle.Short,
                            type: discord_js_1.ComponentType.TextInput
                        }]
                }]
        }).then(async (_) => {
            if (ctx instanceof discord_js_1.Message && await rctx.fetchReply())
                await rctx.deleteReply();
            return rctx.awaitModalSubmit({ time: 5 * 60 * 1000 });
        }).then(async (interaction) => {
            let content = "_";
            song.title = interaction.fields.getTextInputValue(`mamendedittitle`) || song.title;
            song.artist = interaction.fields.getTextInputValue(`mamendeditartist`) || song.artist;
            let genre = interaction.fields.getTextInputValue(`mamendeditgenre`);
            if (genre) {
                if (Object.keys(util_1.Genre).includes(genre)) {
                    song.genre = util_1.Genre[genre];
                }
                else {
                    content = `Couldn't identify genre '${genre}'!`;
                }
            }
            await playlist_1.Playlist.setMusicIndex();
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
                            },
                            {
                                "name": `Artist:`,
                                "value": song.artist,
                                "inline": true
                            },
                            {
                                "name": `Genre:`,
                                "value": song.genre.toString(),
                                "inline": true
                            }
                        ],
                        "footer": {
                            "text": `PlaylistDJ - Global Metadata Viewer`,
                            "icon_url": index_1.client.user?.avatarURL() ?? ""
                        },
                        "url": song.url
                    }]
            });
        }).catch(_ => {
            return rctx.deleteReply().catch(_ => { });
        });
    },
    ac(ctx) {
        const focused = ctx.options.getFocused().toString();
        if (focused.length <= 0)
            return [];
        return Object.values(playlist_1.Playlist.INDEX)
            .filter(k => k.id.startsWith(focused))
            .map(o => {
            return { name: o.title, value: o.id };
        });
    }
};
const Auth = {
    name: "auth",
    description: "Modifies users with administrator privileges.",
    type: discord_js_1.ApplicationCommandOptionType.SubcommandGroup,
    public: false,
    options: [
        {
            "type": discord_js_1.ApplicationCommandOptionType.Subcommand,
            "name": "add",
            "description": "Authorizes a user",
            "options": [
                {
                    "type": discord_js_1.ApplicationCommandOptionType.User,
                    "name": "user",
                    "description": "User to authorize",
                    "required": true
                }
            ]
        },
        {
            "type": discord_js_1.ApplicationCommandOptionType.Subcommand,
            "name": "remove",
            "description": "Deauthorizes a user",
            "options": [{
                    "type": discord_js_1.ApplicationCommandOptionType.User,
                    "name": "user",
                    "description": "User to deauthorize",
                    "required": true,
                }],
        },
        {
            "type": discord_js_1.ApplicationCommandOptionType.Subcommand,
            "name": "list",
            "description": "List authorized users"
        }
    ],
    run: (ctx) => {
        if (!ctx.guild)
            return;
        if (ctx.member?.user.id !== "547624574070816799")
            return (0, util_2.error)(ctx, util_2.ERRORS.NO_PERMS);
        let user, option;
        if (ctx instanceof discord_js_1.CommandInteraction) {
            option = ctx.options.data[0]?.options ? ctx.options.data[0]?.options[0].name : "";
            user = ctx.options.get("user", false)?.user;
        }
        else {
            let u;
            [option, u] = ctx.content.split(/\s+/g).slice(3);
            if (u)
                user = ctx.guild.members.resolve(u.replaceAll(/\D/g, ""))?.user ?? ctx.guild.members.cache.find(m => m.displayName === u)?.user;
        }
        switch (option) {
            case 'add':
                if (!user)
                    return (0, util_2.error)(ctx, util_2.ERRORS.NO_USER);
                if (!index_1.WHITELIST.has(user.id)) {
                    index_1.WHITELIST.add(user.id);
                    (0, util_2.editReply)(ctx, `Added ${user.tag} to the whitelist.`);
                }
                else {
                    (0, util_2.error)(ctx, new Error(`${user.tag} was already on the whitelist.`));
                }
                break;
            case 'remove':
                if (!user)
                    return (0, util_2.error)(ctx, util_2.ERRORS.NO_USER);
                if (index_1.WHITELIST.has(user.id)) {
                    index_1.WHITELIST.delete(user.id);
                    (0, util_2.editReply)(ctx, `Removed ${user.tag} from the whitelist.`);
                }
                else {
                    (0, util_2.error)(ctx, new Error(`${user.tag} wasn't on the whitelist.`));
                }
                break;
            case 'list':
                (0, util_2.editReply)(ctx, {
                    "content": `_`,
                    "embeds": [
                        {
                            "type": "rich",
                            "title": `Bot Administrators`,
                            "description": "",
                            "color": 0x123456,
                            "fields": [...index_1.WHITELIST.keys()].map(id => {
                                return {
                                    "name": index_1.client.users.resolve(id)?.tag,
                                    "value": id
                                };
                            }),
                            "footer": {
                                "text": "PlaylistDJ - Auth List",
                                "icon_url": index_1.client.user?.avatarURL() ?? ""
                            }
                        }
                    ]
                });
                break;
            default:
                (0, util_2.error)(ctx, util_2.ERRORS.INVALID_ARGUMENTS);
                break;
        }
    }
};
const Clean = {
    type: discord_js_1.ApplicationCommandOptionType.Subcommand,
    name: "clean",
    description: "Deletes unreferenced files globally.",
    public: false,
    run: (ctx) => {
        playlist_1.Playlist.clean()
            .once('finish', (files, rmfiles) => {
            (0, util_2.reply)(ctx, `Clean Complete! Deleted ${rmfiles.length} files, ${files.length} files remaining!`);
        }).on('error', async (e) => { (0, util_2.error)(ctx, e); });
    }
};
const Destroy = {
    type: discord_js_1.ApplicationCommandOptionType.Subcommand,
    name: "destroy",
    description: "Deletes music from the filesystem.",
    public: false,
    options: [{
            name: "id",
            description: "Song ID(s) to delete",
            type: discord_js_1.ApplicationCommandOptionType.String,
            required: true,
        }],
    run: async (ctx) => {
        if (!ctx.guild)
            return;
        let inp = ctx instanceof discord_js_1.CommandInteraction
            ? ctx.options.get("id", true).value?.toString()
            : ctx.content.split(/\s+/g)[3];
        if (!inp)
            return (0, util_2.error)(ctx, util_2.ERRORS.INVALID_ARGUMENTS);
        let ids = inp.split(",").slice(undefined, 10).map(id => id.trim());
        if (ids.length <= 0)
            return (0, util_2.error)(ctx, util_2.ERRORS.INVALID_ARGUMENTS);
        let removed = await playlist_1.Playlist.delete(ids);
        if (removed.length < 1)
            return (0, util_2.error)(ctx, util_2.ERRORS.NO_SONG);
        await (0, util_2.reply)(ctx, `Success! Destroyed ${removed.length} song(s).`);
    }
};
const Download = {
    type: discord_js_1.ApplicationCommandOptionType.Subcommand,
    name: "download",
    description: "Downloads music from youtube.",
    options: [{
            "type": discord_js_1.ApplicationCommandOptionType.String,
            name: "url",
            description: "Youtube URL to Download From",
            required: true,
        }],
    public: false,
    run: async (ctx) => {
        if (!ctx.guild)
            return;
        let arg1 = ctx instanceof discord_js_1.CommandInteraction ?
            ctx.options.get("url", true).value?.toString() :
            ctx.content.split(/\s+/g)[3];
        if (!arg1)
            return (0, util_2.error)(ctx, util_2.ERRORS.INVALID_ARGUMENTS);
        let rmsg;
        if (ctx instanceof discord_js_1.Message) {
            rmsg = await ctx.reply({
                "content": "Click this button to continue:",
                "components": [{
                        type: discord_js_1.ComponentType.ActionRow,
                        components: [{
                                "style": discord_js_1.ButtonStyle.Success,
                                "label": `Continue`,
                                "customId": `continue`,
                                "disabled": false,
                                "type": discord_js_1.ComponentType.Button,
                            }]
                    }],
                failIfNotExists: false
            });
        }
        const rctx = ctx instanceof discord_js_1.Message ? (await rmsg?.awaitMessageComponent({
            componentType: discord_js_1.ComponentType.Button,
            filter: (i) => i.user.id === ctx.author.id,
            time: 10 * 1000
        }).catch(_ => { if (rmsg?.deletable)
            rmsg.delete(); })) : ctx;
        if (!rctx?.guild)
            return;
        if (rmsg?.deletable)
            await rmsg.delete();
        const guildid = rctx.guild.id;
        await rctx.reply({ content: "Searching for Playlist...", ephemeral: true });
        try {
            var webpl = await playlist_1.WebPlaylist.fromUrl(arg1);
        }
        catch (e) {
            return (0, util_2.error)(rctx, e);
        }
        const idata = { index: 0, exclusions: [] };
        rctx.editReply({
            "content": "Found!",
            "components": [
                {
                    "type": discord_js_1.ComponentType.ActionRow,
                    "components": [
                        {
                            "style": discord_js_1.ButtonStyle.Primary,
                            "label": `Custom Download`,
                            "customId": `c${commandname}downloadcustom`,
                            "disabled": webpl.ytplaylist.items.length <= 1,
                            "type": discord_js_1.ComponentType.Button,
                        },
                        {
                            "style": discord_js_1.ButtonStyle.Success,
                            "label": `Download All`,
                            "customId": `c${commandname}downloadall`,
                            "disabled": false,
                            "type": discord_js_1.ComponentType.Button,
                        },
                    ]
                }
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
                        "icon_url": index_1.client.user?.avatarURL() ?? ""
                    },
                    "url": webpl.ytplaylist.url,
                }
            ]
        }).then(msg => {
            msg.createMessageComponentCollector({
                filter: (i) => i.user.id === rctx.user.id,
                idle: 20 * 1000
            }).on('collect', async (interaction) => {
                switch (interaction.customId) {
                    case `c${commandname}downloadcustomskip`:
                        idata.exclusions.push(idata.index);
                    case `c${commandname}downloadcustomkeep`:
                        idata.index++;
                    case `c${commandname}downloadcustom`:
                        let video = webpl.ytplaylist.items[idata.index];
                        if (video) {
                            interaction.update({
                                "content": "Keep this video?",
                                "components": [
                                    {
                                        "type": discord_js_1.ComponentType.ActionRow,
                                        "components": [
                                            {
                                                "style": discord_js_1.ButtonStyle.Secondary,
                                                "label": `Keep Remaining`,
                                                "customId": `c${commandname}downloadcustomall`,
                                                "disabled": false,
                                                "type": discord_js_1.ComponentType.Button,
                                            },
                                            {
                                                "style": discord_js_1.ButtonStyle.Success,
                                                "label": `Keep`,
                                                "customId": `c${commandname}downloadcustomkeep`,
                                                "disabled": false,
                                                "type": discord_js_1.ComponentType.Button
                                            },
                                            {
                                                "style": discord_js_1.ButtonStyle.Danger,
                                                "label": `Skip`,
                                                "customId": `c${commandname}downloadcustomskip`,
                                                "disabled": false,
                                                "type": discord_js_1.ComponentType.Button
                                            },
                                            {
                                                "style": discord_js_1.ButtonStyle.Secondary,
                                                "label": `Skip Remaining`,
                                                "customId": `c${commandname}downloadcustomnone`,
                                                "disabled": false,
                                                "type": discord_js_1.ComponentType.Button,
                                            },
                                        ]
                                    }
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
                                            "icon_url": index_1.client.user?.avatarURL() ?? ""
                                        },
                                        "url": video.url,
                                    }
                                ]
                            });
                            break;
                        }
                    case `c${commandname}downloadcustomnone`:
                        for (let i = idata.index; i < webpl.ytplaylist.items.length; i++) {
                            idata.exclusions.push(i);
                        }
                    case `c${commandname}downloadcustomall`:
                        if (idata?.exclusions) {
                            webpl.remove(idata.exclusions);
                        }
                    case `c${commandname}downloadall`:
                        if (!interaction.deferred && !interaction.replied)
                            await interaction.update({ components: [], embeds: [], content: "Downloading..." });
                        webpl.download(guildid)
                            .on('progress', (cur, total, id) => {
                            (0, util_2.editReply)(interaction, `Downloaded: ${cur}/${total} songs. [Current: \`${id}\`]`);
                        }).on('warn', (cur, total, id, error) => {
                            (0, util_2.editReply)(interaction, `Downloaded: ${cur}/${total} songs. [Current: \`${id}\`] (Non-Fatal: ${error.message})`);
                        }).on('finish', (pl) => {
                            (0, util_2.editReply)(interaction, `Success! Your playlist now has ${pl ? pl.playlistdata.items.length : 0} songs downloaded (${pl ? 'total' : 'non-fatal fail'})!`);
                        }).on('error', (e) => {
                            (0, util_2.editReply)(interaction, "Error: " + e.message);
                        });
                        break;
                    default:
                        interaction.update({ components: [] });
                        return;
                }
            }).on('end', (_, reason) => {
                if (reason === "idle")
                    rctx.fetchReply().then(_ => rctx.editReply({ components: [] })).catch();
            });
        }).catch((e) => (0, util_2.error)(rctx, e));
    }
};
const Index = {
    type: discord_js_1.ApplicationCommandOptionType.Subcommand,
    name: "index",
    description: "Lists music in the music database",
    options: [{
            "type": discord_js_1.ApplicationCommandOptionType.String,
            "name": "key",
            "description": "Search filter",
            "required": false,
            choices: [
                { name: "Title", value: "title" },
                { name: "Artist", value: "artist" },
                { name: "Genre", value: "genre" }
            ]
        }, {
            "type": discord_js_1.ApplicationCommandOptionType.String,
            "name": "term",
            "description": "Search term",
            "required": false
        }],
    public: true,
    run: async (ctx) => {
        let arg1 = ctx instanceof discord_js_1.CommandInteraction ?
            ctx.options.get("key", false)?.value?.toString() :
            ctx.content.split(/\s+/g)[3];
        let arg2 = ctx instanceof discord_js_1.CommandInteraction ?
            ctx.options.get("term", false)?.value?.toString() :
            ctx.content.split(/\s+/g).slice(4).join(" ");
        let rmsg;
        if (ctx instanceof discord_js_1.Message) {
            rmsg = await (0, util_2.reply)(ctx, {
                "content": "Click this button to continue:",
                "components": [{
                        type: discord_js_1.ComponentType.ActionRow,
                        components: [{
                                "style": discord_js_1.ButtonStyle.Success,
                                "label": `Continue`,
                                "customId": `continue`,
                                "disabled": false,
                                "type": discord_js_1.ComponentType.Button,
                            }]
                    }]
            }, true);
        }
        const rctx = ctx instanceof discord_js_1.Message ? (await rmsg?.awaitMessageComponent({
            componentType: discord_js_1.ComponentType.Button,
            filter: (i) => i.user.id === ctx.author.id,
            time: 10 * 1000
        }).catch(_ => { if (rmsg?.deletable)
            rmsg.delete(); })) : ctx;
        if (!rctx)
            return;
        if (rmsg?.deletable)
            await rmsg.delete();
        let items = Object.values(playlist_1.Playlist.INDEX);
        let page = 0;
        if (arg1 && arg2) {
            let term = arg2.toLowerCase() ?? "";
            switch (arg1) {
                case 'title':
                    items = items.filter((i) => i.title.toLowerCase().includes(term));
                    break;
                case 'artist':
                    items = items.filter((i) => i.artist.toLowerCase().includes(term));
                    break;
                case 'genre':
                    items = items.filter((i) => i.genre.toString().toLowerCase() === term);
                    break;
            }
        }
        const msg = await (0, util_2.reply)(rctx, listMessage(items, page), true);
        msg.createMessageComponentCollector({
            filter: (i) => i.user.id === rctx.user.id,
            idle: 20 * 1000
        }).on('collect', (interaction) => {
            switch (interaction.customId) {
                case `c${commandname}indexpageup`:
                    page++;
                    break;
                case `c${commandname}indexpagedown`:
                    page--;
                    break;
                default:
                    interaction.update({ components: [] });
                    return;
            }
            interaction.update(listMessage(items, page));
        }).on('end', (_, reason) => {
            if (reason === "idle")
                rctx.fetchReply().then(_ => rctx.editReply({ components: [] })).catch();
        });
    }
};
const GrabCSV = {
    type: discord_js_1.ApplicationCommandOptionType.Subcommand,
    name: "grabcsv",
    description: "Gets the most recent CSV data of a guild.",
    options: [{
            type: discord_js_1.ApplicationCommandOptionType.String,
            name: "id",
            description: "Guild ID",
            required: true,
            autocomplete: true
        }],
    public: false,
    run: (ctx) => {
        if (ctx instanceof discord_js_1.Message)
            return (0, util_2.error)(ctx, new Error("This command has text disabled."));
        const gid = ctx.options.get("id", true).value?.toString();
        if (!gid)
            return (0, util_2.error)(ctx, util_2.ERRORS.INVALID_ARGUMENTS);
        const file = (0, interface_1.getCsv)(gid);
        if (!file)
            return (0, util_2.error)(ctx, new Error("Couldn't find data!"));
        ctx.reply({
            content: "-",
            files: [new discord_js_1.AttachmentBuilder(file, { name: gid + ".csv", description: `CSV Data for '${index_1.client.guilds.cache.get(gid)?.name}'` })],
            ephemeral: true
        });
    },
    ac(ctx) {
        const focused = ctx.options.getFocused().toString();
        if (!focused)
            return [];
        return (0, interface_1.getAllCsvs)()?.filter(s => s.startsWith(focused)).map(s => { return { name: s, value: s }; }) ?? [];
    }
};
const SubCommands = [
    Amend, Auth, Clean, Destroy, Download, Index, GrabCSV
];
exports.Admin = {
    name: commandname,
    description: "Manage global bot data.",
    options: SubCommands,
    defaultMemberPermissions: "Administrator",
    public: true,
    run: (ctx) => {
        if (!ctx.guild)
            return;
        let option = ctx instanceof discord_js_1.CommandInteraction ? ctx.options.data[0].name : ctx.content.split(/\s+/g)[2];
        let subcommand = SubCommands.find(sc => sc.name === option);
        if (!subcommand)
            return (0, util_2.error)(ctx, util_2.ERRORS.INVALID_ARGUMENTS);
        if (!subcommand.public && !(0, util_2.isWhitelisted)(ctx))
            return (0, util_2.error)(ctx, util_2.ERRORS.NO_PERMS);
        return subcommand.run(ctx);
    },
    ac: (ctx) => {
        let command = SubCommands.find(c => c.name === ctx.options.data[0].name);
        if (!command?.ac)
            return new Error("Autocomplete not recognized.");
        return command.ac(ctx);
    }
};
function listMessage(items, page) {
    return {
        "content": "_",
        "components": [{
                "type": discord_js_1.ComponentType.ActionRow, "components": [
                    {
                        "style": discord_js_1.ButtonStyle.Primary,
                        "label": `Prev Page`,
                        "customId": `c${commandname}indexpagedown`,
                        "disabled": page <= 0,
                        "type": discord_js_1.ComponentType.Button
                    },
                    {
                        "style": discord_js_1.ButtonStyle.Primary,
                        "label": `Next Page`,
                        "customId": `c${commandname}indexpageup`,
                        "disabled": page >= Math.floor(items.length / util_2.ITEMS_PER_PAGE),
                        "type": discord_js_1.ComponentType.Button
                    },
                ]
            }],
        "embeds": [{
                "type": "rich",
                "title": `All Results (${items.length})`,
                "description": "Global Music Index",
                "color": 0xff0000,
                "fields": items.slice(page * util_2.ITEMS_PER_PAGE, (page + 1) * util_2.ITEMS_PER_PAGE).map(s => {
                    return {
                        "name": s.title,
                        "value": s.id,
                        "inline": true,
                    };
                }) || { "name": "No Results", "value": "Out Of Bounds", "inline": false },
                "footer": {
                    "text": `PlaylistDJ - Song Index - Page ${page + 1}/${Math.ceil(items.length / util_2.ITEMS_PER_PAGE)}`,
                    "icon_url": index_1.client.user?.avatarURL() ?? ""
                }
            }]
    };
}
