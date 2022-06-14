import { BaseCommandInteraction, ButtonInteraction, InteractionUpdateOptions, Message, MessageActionRow, MessageActionRowComponent, MessageEmbed, MessageOptions, MessagePayload } from "discord.js";
import { client } from "../index";
import ytpl from "ytpl";
import ytdl from "ytdl-core";
import { editReply, reply, disableButtons } from "../util";
import { Command } from "./Command";
import fs from "fs";
// https://www.npmjs.com/package/ytdl-core

const commandname = "download";

let idata: {[key: string]: {index: number, exclusions: Array<number>}} = {}

export const Download: Command = {
    name: commandname,
    description: "Downloads your playlist from youtube.",
    type: "CHAT_INPUT",
    options: [{
        name: "url",
        description: "Youtube Playlist URL to Download",
        type: 3, // string
        required: true,
    }],

    run: async (ctx: BaseCommandInteraction | Message) => {
        await ctx.channel?.sendTyping()
        let url: string | null | undefined;
        if (ctx instanceof BaseCommandInteraction) {
            url = ctx.options.get("url", true).value?.toString()
        } else if (ctx instanceof Message) {
            url = ctx.content.replaceAll(/\s{2,}/g," ").split(" ")[2]
        }
        if (!url) { reply(ctx, "Invalid arguments!"); return; }
        if (!ytpl.validateID(url)) { reply(ctx, "Invalid YT URL!"); return; }

        reply(ctx, "Detecting Playlist...");
        ctx.channel?.sendTyping()

        let playlist;
        try {
            playlist = await ytpl(url, { limit: Number.POSITIVE_INFINITY })
        } catch (e) {return editReply(ctx, "Couldn't find playlist!");}
        
        let msg: MessageOptions = {
            "content": "Found!",
            "components": [
                {
                    "type": "ACTION_ROW",
                    "components": [
                        {
                            "style": "PRIMARY",
                            "label": `Custom Download`,
                            "customId": `c${commandname}custom`,
                            "disabled": false,
                            "type": "BUTTON",
                        } as MessageActionRowComponent,
                        {
                            "style": "SUCCESS",
                            "label": `Download All`,
                            "customId": `c${commandname}all`,
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
        } as MessageOptions

        if (ctx instanceof BaseCommandInteraction) {
            let m: any = msg;
            m.attachments = msg.attachments?.values()
            ctx.editReply(m as MessagePayload);
        } else {
            editReply(ctx,msg);
        }
    },

    interact: async (ctx: ButtonInteraction) => {
        if (!ctx.guild || ctx.deferred) return;
        if (!ctx.message.embeds[0].url) return reply(ctx,"Couldn't find playlist!")
        try {
            var playlist = await ytpl(ctx.message.embeds[0].url)
        } catch (e) {return reply(ctx,"Couldn't find playlist!")}
        switch (ctx.customId) {
            case 'cdownloadcustomskip':
                if (!idata[ctx.guild.id]) idata[ctx.guild.id] = {index:0,exclusions:[]}
                idata[ctx.guild.id].exclusions.push(idata[ctx.guild.id].index)
            case 'cdownloadcustomkeep':
                idata[ctx.guild.id].index++;
            case 'cdownloadcustom':
                if (ctx.customId === 'cdownloadcustom') idata[ctx.guild.id] = {index:0,exclusions:[]}
                let video = playlist.items[idata[ctx.guild.id].index];
                if (video) {
                    ctx.channel?.sendTyping()
                    ctx.update({
                        "content": "Keep this video?",
                        "components": [
                            {
                                "type": "ACTION_ROW",
                                "components": [
                                    {
                                        "style": "SECONDARY",
                                        "label": `Keep Remaining`,
                                        "customId": `c${commandname}customall`,
                                        "disabled": false,
                                        "type": "BUTTON",
                                    } as MessageActionRowComponent,
                                    {
                                        "style": "SUCCESS",
                                        "label": `Keep`,
                                        "customId": `c${commandname}customkeep`,
                                        "disabled": false,
                                        "type": "BUTTON"
                                    } as MessageActionRowComponent,
                                    {
                                        "style": "DANGER",
                                        "label": `Skip`,
                                        "customId": `c${commandname}customskip`,
                                        "disabled": false,
                                        "type": "BUTTON"
                                    } as MessageActionRowComponent,
                                    {
                                        "style": "SECONDARY",
                                        "label": `Skip Remaining`,
                                        "customId": `c${commandname}customnone`,
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
                                    "text": `PlaylistDJ - Video Selection - Video ${idata[ctx.guild.id].index+1}/${playlist.items.length}`,
                                    "iconURL": client.user?.avatarURL() ?? ""
                                },
                                "url": video.url,
                            } as MessageEmbed
                        ]
                    } as InteractionUpdateOptions)
                    break;
                }
            case 'cdownloadcustomnone':
                for (let i = idata[ctx.guild.id].index; i < playlist.items.length; i++) {
                    idata[ctx.guild.id].exclusions.push(i);
                }
            case 'cdownloadcustomall':
                idata[ctx.guild.id].index = 0;
            case 'cdownloadall':
                disableButtons(ctx, {content: "Downloading...", embeds: [], components: []});
                ctx.channel?.sendTyping()

                if (idata[ctx.guild.id]?.exclusions) {playlist.items = playlist.items.filter((_,i)=>!(idata[ctx.guild?.id ?? "-1"].exclusions.includes(i))); delete idata[ctx.guild.id]}
                reply(ctx,`Downloading: ${playlist.items.length} songs total`)
                let done: number = 0;
                Promise.all(playlist.items.map((video,i) => {return new Promise<void>((resolve,reject) => {
                    fs.mkdirSync(`./resources/music/${ctx.guild?.id ?? "unknown"}`, {recursive:true});
                    fs.openSync(`./resources/music/${ctx.guild?.id ?? "unknown"}/${playlist.items[i].id}.ogg`,'w')
                    try {
                        ytdl(video.url, {quality:"highestaudio", filter: "audioonly"}).pipe(fs.createWriteStream(`./resources/music/${ctx.guild?.id ?? "unknown"}/${playlist.items[i].id}.ogg`))
                        .on('finish', () => {
                            done++;
                            editReply(ctx,`Downloading: ${done}/${playlist.items.length} songs`);
                            resolve()
                        }).on('error', reject)
                    } catch (e) {reject(e)}
                })})).then(() => {
                    editReply(ctx,{
                        content: `Success! ${fs.readdirSync(`./resources/music/${ctx.guild?.id ?? "unknown"}`).length} files downloaded from '${playlist.title}'!`,
                        components:[{"type": 1,"components": [{
                            "style": 3,
                            "label": `Download Complete!`,
                            "customId": "disable",
                            "disabled": true,
                            "type": 2
                        }]}]
                    });
                }).catch(e => {
                    console.error(e)
                    editReply(ctx,`An error occured.`);
                })
            break;
        }
    }
};