import { BaseCommandInteraction, Message, MessageActionRow, MessageActionRowComponent, MessageEmbed } from "discord.js";
import { client } from "../index";
import ytpl from "ytpl";
import { editReply, reply } from "../util";
import { Command } from "./Command";

export const Download: Command = {
    name: "download",
    description: "Downloads your playlist from youtube.",
    type: "CHAT_INPUT",
    options: [
        {
            name: "url",
            description: "Youtube Playlist URL to Download",
            type: 3, // string
            required: true,
        },
        {
            name: "customize",
            description: "Check which videos to download?",
            type: 5, // boolean
            required: false,
        }
    ],

    run: async (ctx: BaseCommandInteraction | Message) => {
        await ctx.channel?.sendTyping()
        let u, c: string | null | undefined;
        if (ctx instanceof BaseCommandInteraction) {
            u = ctx.options.get("url", true).value?.toString()
            c = ctx.options.get("customize", false)?.value?.toString()
        } else if (ctx instanceof Message) { // dj download https://youtube.com/yourmom true
            [u, c] = ctx.content.split(" ").slice(2, 4)
        }
        if (!u) { reply(ctx, "Invalid arguments!"); return; }
        let customize: boolean = !!c && ["true", "t", "1", "yes"].includes(c)
        let url: URL;
        try {
            url = new URL(u);
        } catch (e) { reply(ctx, "Invalid URL!"); return; }
        if (!validate(url)) { reply(ctx, "Invalid YT URL!"); return; }

        reply(ctx, "Detecting Playlist...");
        ctx.channel?.sendTyping()

        let playlist = await ytpl(url.toString(), { limit: Number.POSITIVE_INFINITY })
        if (!playlist) { editReply(ctx, "Couldn't find playlist!"); return; }
        
        let msg: Message = {
            "content": "Found!",
            "components": [
                {
                    "type": "ACTION_ROW",
                    "components": [
                        {
                            "style": "PRIMARY",
                            "label": `Custom Download`,
                            "customId": `row_0_button_0`,
                            "disabled": false,
                            "type": "BUTTON",
                        } as MessageActionRowComponent,
                        {
                            "style": "SUCCESS",
                            "label": `Download All`,
                            "customId": `row_0_button_1`,
                            "disabled": false,
                            "type": "BUTTON"
                        } as MessageActionRowComponent,
                        {
                            "style": "DANGER",
                            "label": `Cancel`,
                            "customId": `row_0_button_2`,
                            "disabled": false,
                            "type": "BUTTON"
                        } as MessageActionRowComponent
                    ]
                } as MessageActionRow
            ],
            "embeds": [
                {
                    type: "rich",
                    title: `${playlist.title} - ${playlist.estimatedItemCount} Items`,
                    description: playlist.description,
                    color: 0xFF0000,
                    "image": {
                        "url": playlist.bestThumbnail.url ?? "",
                        "height": playlist.bestThumbnail.height,
                        "width": playlist.bestThumbnail.width
                    },
                    "author": {
                        "name": playlist.author.name,
                        "iconURL": playlist.author.bestAvatar.url,
                        "url": playlist.author.url
                    },
                    "footer": {
                        "text": `PlaylistDJ - Playlist Download`,
                        "iconURL": client.user?.avatarURL() ?? ""
                    },
                    "url": playlist.url,
                } as MessageEmbed
            ]
        } as Message
        editReply(ctx,msg)
    }
};

function validate(u: URL): u is youtubeurl {
    return u.origin === "https://www.youtube.com" && u.searchParams.has("list")
}
type youtubeurl = {
    origin: "https://www.youtube.com",
    searchParams: {
        list: string
    }
} & URL