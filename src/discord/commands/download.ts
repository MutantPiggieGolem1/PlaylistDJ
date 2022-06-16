import { BaseCommandInteraction, ButtonInteraction, InteractionUpdateOptions, Message, MessageActionRow, MessageActionRowComponent, MessageEmbed, MessageOptions, MessagePayload } from "discord.js";
import { client } from "../../index";
import { editReply, reply } from "../util";
import { Command } from "./Commands";
import fs from "fs";
import { MusicJSON } from "../../youtube/util";
import { WebPlaylist } from "../../youtube/playlist";

const commandname = "download";

let idata: {[key: string]: {playlist: WebPlaylist, index: number, exclusions: Array<number>}} = {} // Option Cache

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
        let url: string | null | undefined;
        if (ctx instanceof BaseCommandInteraction) {
            url = ctx.options.get("url", true).value?.toString()
        } else if (ctx instanceof Message) {
            url = ctx.content.replaceAll(/\s{2,}/g," ").split(" ")[2]
        }
        if (!url) { reply(ctx, "Invalid arguments!"); return; }

        reply(ctx, "Detecting Playlist...");
        ctx.channel?.sendTyping()

        let playlist: WebPlaylist;
        try {
            playlist = await WebPlaylist.fromUrl(url);
        } catch (e) {return reply(ctx,"An Error Occured:"+e)}
        
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
                    title: `${playlist.ytplaylist.title} - ${playlist.ytplaylist.estimatedItemCount} Items`,
                    description: playlist.ytplaylist.description,
                    color: 0xFF0000,
                    "image": {
                        "url": playlist.ytplaylist.bestThumbnail.url ?? "",
                        "height": playlist.ytplaylist.bestThumbnail.height,
                        "width": playlist.ytplaylist.bestThumbnail.width
                    },
                    "author": {
                        "name": playlist.ytplaylist.author.name,
                        "iconURL": playlist.ytplaylist.author.bestAvatar.url,
                        "url": playlist.ytplaylist.author.url
                    },
                    "footer": {
                        "text": `PlaylistDJ - Playlist Download`,
                        "iconURL": client.user?.avatarURL() ?? ""
                    },
                    "url": playlist.ytplaylist.url,
                } as MessageEmbed
            ]
        } as MessageOptions

        editReply(ctx,msg);
    },

    interact: async (ctx: ButtonInteraction) => {
        if (!ctx.guild) return;
        let guildid = ctx.guild.id;
        let playlist: WebPlaylist;
        if (idata[ctx.guild.id]?.playlist) {
            playlist = idata[ctx.guild.id].playlist
        } else {
            try {
                if (!ctx.message.embeds[0].url) {return ctx.reply("Couldn't find playlist!")}
                playlist = await WebPlaylist.fromUrl(ctx.message.embeds[0].url)
            } catch (e) {return ctx.reply("Couldn't find playlist!")}
        }
        switch (ctx.customId) {
            case 'cdownloadcustomskip':
                idata[ctx.guild.id].exclusions.push(idata[ctx.guild.id].index)
            case 'cdownloadcustomkeep':
                idata[ctx.guild.id].index++;
            case 'cdownloadcustom':
                if (ctx.customId === 'cdownloadcustom') {idata[ctx.guild.id] = {index:0,exclusions:[],playlist}}
                let video = playlist.ytplaylist.items[idata[ctx.guild.id].index];
                if (video) {
                    ctx.update({ // FIXME: DiscordAPIError: Unknown Interaction
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
                                    "text": `PlaylistDJ - Video Selection - Video ${idata[ctx.guild.id].index+1}/${playlist.ytplaylist.items.length}`,
                                    "iconURL": client.user?.avatarURL() ?? ""
                                },
                                "url": video.url,
                            } as MessageEmbed
                        ]
                    } as InteractionUpdateOptions)
                    break;
                }
            case 'cdownloadcustomnone':
                for (let i = idata[ctx.guild.id].index; i < playlist.ytplaylist.items.length; i++) {
                    idata[ctx.guild.id].exclusions.push(i);
                }
            case 'cdownloadcustomall':
                if (idata[ctx.guild?.id]?.exclusions) {playlist.remove(idata[guildid].exclusions)}
                // FIXME: Disable custom selecton menu here
            case 'cdownloadall':
                delete idata[ctx.guild.id];
                
                if (!ctx.deferred && ctx.isRepliable()) ctx.deferReply({"ephemeral": true});
                playlist.download(`./resources/music/${ctx.guild?.id ?? "unknown"}/`,false)
                .once('start', (items) => {
                    editReply(ctx,`Downloading: ${items.length} songs.`)
                }).on('progress', (pdata: MusicJSON) => {
                    editReply(ctx,`Downloaded: ${Object.keys(pdata).length}/${playlist.ytplaylist.items.length} songs.`);
                }).on('finish',(playlist: MusicJSON) => {
                    editReply(ctx,`Success! ${fs.readdirSync(`./resources/music/${guildid}/`).length} files downloaded from '${playlist.title}'!`);
                }).on('warn' , (e: Error) => {
                    editReply(ctx,`Downloading: Non-Fatal Error Occured: `+e.name)
                }).on('error', (e: Error) => {
                    editReply(ctx,`Error: `+e.message);
                })
            break;
        }
    }
};