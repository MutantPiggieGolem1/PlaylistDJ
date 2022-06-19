import { BaseCommandInteraction, ButtonInteraction, EmbedField, Message, MessageActionRow, MessageActionRowComponent, MessageComponentInteraction, MessageOptions } from "discord.js";
import { Genre, RealSong } from "../../youtube/util";
import { Playlist } from "../../youtube/playlist";
import { reply } from "../util";
import { Command } from "./Commands";
import { client } from "../../index";

export const Edit: Command = {
    name: "edit",
    description: "Edits music metadata in your playlist.",
    type: "CHAT_INPUT",
    public: false,
    options: [{
        name: "id",
        description: "Song ID to edit",
        type: 3, // string
        required: true,
    },{
        name: "field",
        description: "Field to edit",
        type: "STRING",
        required: false
    },{
        name: "value",
        description: "Value to assign",
        type: "STRING",
        required: false
    }],

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        let id: string | undefined, field: string | undefined, value: string | undefined;
        if (ctx instanceof BaseCommandInteraction) {
            id = ctx.options.get("id", true).value?.toString()
            field = ctx.options.get("field", false)?.value?.toString()?.toLowerCase()
            value = ctx.options.get("value", false)?.value?.toString()
        } else {
            let args: string[] = ctx.content.split(/\s+/g);
            id = args[2]
            field = args[4]?.toLowerCase()
            value = args.slice(4)?.join(" ")
        }
        if (!id) return reply(ctx, "Invalid Arguments!")

        try {
            var playlist: Playlist = new Playlist(`./resources/music/${ctx.guild.id}/`);
        } catch { return reply(ctx, "Couldn't find playlist!") }
        let songindex: number = playlist.playlistdata.items.findIndex(i => i.id === id)
        if (songindex < 0) return reply(ctx, "Couldn't find song!")
        let song: RealSong = playlist.playlistdata.items[songindex]

        if (field && value) {
            switch (field) {
                case "title":
                    song.title = value;
                break;
                case "artist":
                    song.artist = value;
                break;
                case "genre":
                    if (!Object.keys(Genre).includes(value)) return reply(ctx, `Couldn't identify genre ${value}!`)
                    song.genre = <Genre>(<any>Genre)[value];
                break;
                case "tags":
                    song.tags = value.split(",").map(v=>v.trim())
                break;
                default:
                    return reply(ctx, `Invalid field '${field}'!`);
            }
        }

        playlist.setSong = song;

        reply(ctx,{
            "content": "_",
            "embeds": [{"type": "rich",
                "title": "Song ID: "+song.id,
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
                        "customId": `ceditsave`,
                        "disabled": false,
                        "type": "BUTTON",
                    } as MessageActionRowComponent,
                    {
                        "style": "DANGER",
                        "label": `Cancel`,
                        "customId": `cancel`,
                        "disabled": false,
                        "type": "BUTTON",
                    } as MessageActionRowComponent
                ]
            } as MessageActionRow]
        } as MessageOptions);
    },

    interact: async (ctx: ButtonInteraction) => {
        if (!ctx.guild) return;

        try {
            await new Playlist(`./resources/music/${ctx.guild.id}/`).save()
        } catch (e) {
            return reply(ctx,"An Error Occured: "+e);
        }
        ctx.update({content:"Saved!",components:[]}) // FIXME: What if setting an interaction to ephemeral is causing the unknown interaction issue
    }
}