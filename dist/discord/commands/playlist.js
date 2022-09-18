"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Playlist = void 0;
const tslib_1 = require("tslib");
const discord_js_1 = require("discord.js");
const index_1 = require("../../index");
const yt = tslib_1.__importStar(require("../../youtube/playlist"));
const util_1 = require("../../youtube/util");
const util_2 = require("../util");
const commandname = "playlist";
const Create = {
    type: discord_js_1.ApplicationCommandOptionType.Subcommand,
    name: "create",
    description: "Creates a playlist from existing songs.",
    options: [{
            type: discord_js_1.ApplicationCommandOptionType.String,
            name: "url",
            description: "Youtube playlist URL with songs to add",
            required: true,
        }],
    public: true,
    run: (ctx) => {
        if (!ctx.guild)
            return;
        let arg1 = ctx instanceof discord_js_1.CommandInteraction ?
            ctx.options.get("url", true).value?.toString() :
            ctx.content.split(/\s+/g)[3];
        if (!arg1)
            return (0, util_2.error)(ctx, util_2.ERRORS.INVALID_ARGUMENTS);
        const guildid = ctx.guild.id;
        if (ctx instanceof discord_js_1.CommandInteraction)
            ctx.deferReply({ ephemeral: true });
        yt.WebPlaylist.fromUrl(arg1).then((webpl) => webpl.getIds()).then(ids => yt.Playlist.create(guildid, ids, arg1)).then((playlist) => {
            (0, util_2.reply)(ctx, `Created a new playlist with ${playlist.playlistdata.items.length} song(s)!`);
        }).catch((e) => { (0, util_2.error)(ctx, e); });
    }
};
const Delete = {
    type: discord_js_1.ApplicationCommandOptionType.Subcommand,
    name: "delete",
    description: "Deletes your playlist.",
    public: true,
    run: async (ctx) => {
        if (!ctx.guild)
            return;
        const msg = await (0, util_2.reply)(ctx, {
            content: "_",
            components: [{
                    type: discord_js_1.ComponentType.ActionRow,
                    "components": [
                        {
                            "style": discord_js_1.ButtonStyle.Success,
                            "label": `Confirm`,
                            "customId": `cplaylistdeleteconfirm`,
                            "disabled": false,
                            "type": discord_js_1.ComponentType.Button
                        },
                        {
                            "style": discord_js_1.ButtonStyle.Danger,
                            "label": `Cancel`,
                            "customId": `cancel`,
                            "disabled": false,
                            "type": discord_js_1.ComponentType.Button
                        }
                    ]
                }],
            embeds: [{
                    title: "Are you sure you want to delete your playlist?",
                    description: "This action is permanent and irreversible.",
                    color: 0xFF0000,
                    footer: {
                        text: "PlaylistDJ - Confirmation Dialog",
                        icon_url: index_1.client.user?.avatarURL() ?? ""
                    }
                }]
        }, true);
        msg.createMessageComponentCollector({
            filter: (i) => i.user.id === (ctx instanceof discord_js_1.CommandInteraction ? ctx.user : ctx.author).id,
            time: 5 * 1000, max: 1
        }).once("collect", (interaction) => {
            if (interaction.customId === 'cancel') {
                interaction.update({ content: "Cancelled.", components: [], embeds: [] });
                return;
            }
            if (!interaction.guild) {
                (0, util_2.error)(ctx, util_2.ERRORS.NO_GUILD);
                return;
            }
            let playlist = yt.getPlaylist(interaction.guild.id);
            if (!playlist) {
                (0, util_2.error)(ctx, util_2.ERRORS.NO_PLAYLIST);
                return;
            }
            playlist.delete().then(_ => {
                interaction.update({ content: `Deleted your playlist.`, components: [], embeds: [] });
            }).catch((e) => (0, util_2.error)(ctx, e));
        }).on("end", (_, reason) => {
            if (reason === "idle" && msg.editable)
                msg.fetch().then(_ => msg.edit({ content: "Cancelled. (Timed Out)", components: [] })).catch();
        });
    },
};
const Add = {
    type: discord_js_1.ApplicationCommandOptionType.Subcommand,
    name: "add",
    description: "Adds music to your playlist.",
    options: [{
            type: discord_js_1.ApplicationCommandOptionType.String,
            name: "ids",
            description: "Song IDs to add",
            required: true,
        }],
    public: true,
    run: (ctx) => {
        if (!ctx.guild)
            return;
        let arg1 = ctx instanceof discord_js_1.CommandInteraction ?
            ctx.options.get("ids")?.value?.toString() :
            ctx.content.split(/\s+/g)[3];
        if (!arg1)
            return (0, util_2.error)(ctx, util_2.ERRORS.INVALID_ARGUMENTS);
        let playlist = yt.getPlaylist(ctx.guild.id);
        if (!playlist)
            return (0, util_2.error)(ctx, util_2.ERRORS.NO_PLAYLIST);
        let added = playlist.addSongs(arg1.split(",").map(i => i.trim()));
        if (added.length < 1)
            return (0, util_2.error)(ctx, new Error("No songs were added!"));
        (0, util_2.reply)(ctx, `Added ${added.length} song(s) to the playlist!\n> ${added.map(rs => (0, util_2.truncateString)(rs.title, Math.floor(60 / added.length))).join(", ")}`);
    }
};
const Remove = {
    type: discord_js_1.ApplicationCommandOptionType.Subcommand,
    name: "remove",
    description: "Removes music from your playlist.",
    options: [{
            "type": discord_js_1.ApplicationCommandOptionType.String,
            "name": "ids",
            "description": "Song IDs to remove",
            "required": true,
        }],
    public: true,
    run: (ctx) => {
        if (!ctx.guild)
            return;
        let arg1 = ctx instanceof discord_js_1.CommandInteraction ?
            ctx.options.get("ids")?.value?.toString() :
            ctx.content.split(/\s+/g)[3];
        if (!arg1)
            return (0, util_2.error)(ctx, util_2.ERRORS.INVALID_ARGUMENTS);
        let playlist = yt.getPlaylist(ctx.guild.id);
        if (!playlist)
            return (0, util_2.error)(ctx, util_2.ERRORS.NO_PLAYLIST);
        let removed = playlist.removeSongs(arg1.split(",").map(i => i.trim()));
        if (removed.length < 1)
            return (0, util_2.error)(ctx, util_2.ERRORS.NO_SONG);
        (0, util_2.reply)(ctx, `Removed ${removed.length} song(s) from the playlist!\n> ${removed.map(rs => (0, util_2.truncateString)(rs.title, Math.floor(60 / removed.length))).join(", ")}`);
    }
};
const List = {
    type: discord_js_1.ApplicationCommandOptionType.Subcommand,
    name: "list",
    description: "Lists music on your playlist",
    options: [{
            "type": discord_js_1.ApplicationCommandOptionType.String,
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
            "type": discord_js_1.ApplicationCommandOptionType.String,
            "name": "term",
            "description": "Search term",
            "required": false
        }],
    public: true,
    run: async (ctx) => {
        if (!ctx.guild)
            return;
        let arg1 = ctx instanceof discord_js_1.CommandInteraction ?
            ctx.options.get("key", false)?.value?.toString() :
            ctx.content.split(/\s+/g)[3];
        let arg2 = ctx instanceof discord_js_1.CommandInteraction ?
            ctx.options.get("term", false)?.value?.toString() :
            ctx.content.split(/\s+/g).slice(4).join(" ");
        let playlist = yt.getPlaylist(ctx.guild.id);
        if (!playlist)
            return (0, util_2.error)(ctx, util_2.ERRORS.NO_PLAYLIST);
        let items = playlist.playlistdata.items;
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
                case 'sort':
                    switch (term) {
                        case 'top':
                            items = items.filter((a) => a.score > 0);
                            items = items.sort((a, b) => b.score - a.score);
                            break;
                    }
                    break;
            }
        }
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
        const msg = await (0, util_2.reply)(rctx, listMessage(rctx, items, page));
        msg.createMessageComponentCollector({
            componentType: discord_js_1.ComponentType.Button,
            filter: (i) => i.user.id === rctx.user.id,
            idle: 20 * 1000
        }).on('collect', (interaction) => {
            switch (interaction.customId) {
                case `c${commandname}listpageup`:
                    page++;
                    break;
                case `c${commandname}listpagedown`:
                    page--;
                    break;
            }
            interaction.update(listMessage(rctx, items, page));
        }).on('end', (_, reason) => {
            if (reason === "idle")
                rctx.fetchReply().then(_ => rctx.editReply({ components: [] })).catch();
        });
    },
};
const Edit = {
    type: discord_js_1.ApplicationCommandOptionType.Subcommand,
    name: "edit",
    description: "Modifies music metadata in your playlist.",
    options: [{
            name: "id",
            description: "Song ID to edit",
            type: discord_js_1.ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true,
        }],
    public: true,
    run: async (ctx) => {
        if (!ctx.guild)
            return;
        let id, field, value;
        if (ctx instanceof discord_js_1.CommandInteraction) {
            id = ctx.options.get("id", true).value?.toString();
            field = ctx.options.get("field", false)?.value?.toString()?.toLowerCase();
            value = ctx.options.get("value", false)?.value?.toString();
        }
        else {
            let args = ctx.content.split(/\s+/g).slice(3);
            id = args[0];
            field = args[1]?.toLowerCase();
            value = args.slice(2)?.join(" ");
        }
        if (!id || (field && !value))
            return (0, util_2.error)(ctx, util_2.ERRORS.INVALID_ARGUMENTS);
        const playlist = yt.getPlaylist(ctx.guild.id);
        if (!playlist)
            return (0, util_2.error)(ctx, util_2.ERRORS.NO_PLAYLIST);
        let songindex = playlist.playlistdata.items.findIndex(i => i.id === id);
        if (songindex < 0)
            return (0, util_2.error)(ctx, util_2.ERRORS.NO_SONG);
        const song = playlist.playlistdata.items[songindex];
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
        await rctx.showModal({
            customId: `c${commandname}editedit`,
            title: `Song Metadata Editor [${song.id}]`,
            components: [{
                    type: discord_js_1.ComponentType.ActionRow,
                    components: [{
                            customId: `meditedittitle`,
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
                            customId: `mediteditartist`,
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
                            customId: `mediteditgenre`,
                            label: "Song Genre:",
                            maxLength: 16,
                            placeholder: song.genre.toString(),
                            required: false,
                            style: discord_js_1.TextInputStyle.Short,
                            type: discord_js_1.ComponentType.TextInput
                        }]
                }, {
                    type: discord_js_1.ComponentType.ActionRow,
                    components: [{
                            customId: `meditedittags`,
                            label: "Tags:",
                            maxLength: 128,
                            placeholder: song.tags?.join(", ") || "None",
                            required: false,
                            style: discord_js_1.TextInputStyle.Paragraph,
                            type: discord_js_1.ComponentType.TextInput
                        }]
                }]
        });
        const interaction = await rctx.awaitModalSubmit({ time: 5 * 60 * 1000 }).catch((e) => { (0, util_2.error)(rctx, e); });
        if (!interaction)
            return;
        song.title = interaction.fields.getTextInputValue(`meditedittitle`) || song.title;
        song.artist = interaction.fields.getTextInputValue(`mediteditartist`) || song.artist;
        let genre = interaction.fields.getTextInputValue(`mediteditgenre`);
        if (genre) {
            if (!Object.keys(util_1.Genre).includes(genre))
                return (0, util_2.error)(ctx, new Error(`Couldn't identify genre ${genre}!`));
            song.genre = util_1.Genre[genre];
        }
        song.tags = interaction.fields.getTextInputValue(`meditedittags`)?.split(",")?.map(i => i.trim()) || song.tags;
        playlist.editSong(song);
        await playlist.save();
        await (0, util_2.reply)(interaction, {
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
                        },
                        {
                            "name": `Artist:`,
                            "value": song.artist || "-",
                            "inline": true
                        },
                        {
                            "name": `Genre:`,
                            "value": song.genre?.toString() || "-",
                            "inline": true
                        },
                        {
                            "name": `Score:`,
                            "value": song.score?.toString() || "-",
                            "inline": true
                        },
                        {
                            "name": `Tags:`,
                            "value": song.tags?.join(", ") || "None",
                            inline: false
                        }
                    ],
                    "footer": {
                        "text": `PlaylistDJ - Metadata Viewer`,
                        "icon_url": index_1.client.user?.avatarURL() ?? ""
                    },
                    "url": song.url
                }]
        });
    },
    ac(ctx) {
        if (!ctx.guild)
            return new Error(util_2.ERRORS.NO_GUILD);
        const playlist = yt.getPlaylist(ctx.guild.id);
        if (!playlist?.playlistdata.items || playlist.playlistdata.items.length <= 0)
            return new Error(util_2.ERRORS.NO_PLAYLIST);
        const focused = ctx.options.getFocused().toString();
        if (focused.length <= 0)
            return [];
        return Object.values(playlist.playlistdata.items)
            .filter(k => k.id.startsWith(focused))
            .map(o => {
            return { name: o.title, value: o.id };
        });
    }
};
const SubCommands = [
    Create, Delete, Add, Remove, List, Edit
];
exports.Playlist = {
    name: commandname,
    description: "Manage your server playlist.",
    options: SubCommands,
    defaultMemberPermissions: "ManageGuild",
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
function listMessage(ctx, items, page) {
    if (!ctx.guild)
        return { content: "Couldn't find guild!" };
    return {
        "content": "_",
        "components": [{
                "type": discord_js_1.ComponentType.ActionRow, "components": [
                    {
                        "style": discord_js_1.ButtonStyle.Primary,
                        "label": `Prev Page`,
                        "customId": `c${commandname}listpagedown`,
                        "disabled": page <= 0,
                        "type": discord_js_1.ComponentType.Button
                    },
                    {
                        "style": discord_js_1.ButtonStyle.Primary,
                        "label": `Next Page`,
                        "customId": `c${commandname}listpageup`,
                        "disabled": page >= Math.floor(items.length / util_2.ITEMS_PER_PAGE),
                        "type": discord_js_1.ComponentType.Button
                    }
                ]
            }],
        "embeds": [{
                "type": "rich",
                "title": `All Results (${items.length})`,
                "description": `${ctx.guild.name.length > 20 ? ctx.guild.nameAcronym : ctx.guild.name} Server Playlist`,
                "color": 0xff0000,
                "fields": items.slice(page * util_2.ITEMS_PER_PAGE, (page + 1) * util_2.ITEMS_PER_PAGE).map(s => {
                    return {
                        "name": s.title,
                        "value": s.id,
                        "inline": true,
                    };
                }) || { "name": "No Results", "value": "Out Of Bounds", "inline": false },
                "footer": {
                    "text": `PlaylistDJ - Song List - Page ${page + 1}/${Math.ceil(items.length / util_2.ITEMS_PER_PAGE)}`,
                    "icon_url": index_1.client.user?.avatarURL() ?? ""
                }
            }]
    };
}
