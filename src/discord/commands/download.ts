import { BaseCommandInteraction, ButtonInteraction, InteractionUpdateOptions, Message, MessageActionRow, MessageActionRowComponent, MessageEmbed, MessageOptions, MessagePayload } from "discord.js";
import { client } from "../../index";
import { editReply, reply } from "../util";
import { Command } from "./Commands";
import { Playlist, WebPlaylist } from "../../youtube/playlist";

const commandname = "download";

let idata: {[key: string]: {playlist: WebPlaylist, overwrite: boolean, index: number, exclusions: Array<number>}} = {} // Option Cache

export const Download: Command = {
    name: commandname,
    description: "Downloads music from youtube.",
    type: "CHAT_INPUT",
    public: false,
    options: [{
        name: "url",
        description: "Youtube URL to Download From",
        type: 3, // string
        required: true,
    }],

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        let url: string | null | undefined;
        let overwrite: boolean = false;
        url = ctx instanceof BaseCommandInteraction ?
            ctx.options.get("url", true).value?.toString() :
            ctx.content.split(/\s+/g)[2]
        if (!url) { reply(ctx, "Invalid arguments!"); return; }

        reply(ctx, "Detecting Playlist...");
        ctx.channel?.sendTyping()

        let playlist: WebPlaylist;
        try {
            playlist = await WebPlaylist.fromUrl(url);
        } catch (e) {return reply(ctx,"An Error Occured: "+e)}
        
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
                            "disabled": playlist.ytplaylist.items.length <= 1,
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
                    "author": playlist.ytplaylist.author ? {
                        "name": playlist.ytplaylist.author.name,
                        "iconURL": playlist.ytplaylist.author.bestAvatar.url,
                        "url": playlist.ytplaylist.author.url
                    } : {"name": "Unknown Author"},
                    "footer": {
                        "text": `PlaylistDJ - Playlist Download`,
                        "iconURL": client.user?.avatarURL() ?? ""
                    },
                    "url": playlist.ytplaylist.url,
                } as MessageEmbed
            ]
        } as MessageOptions

        idata[ctx.guild.id] = {playlist,overwrite,index:0,exclusions:[]}
        editReply(ctx,msg);
    },

    interact: async (ctx: ButtonInteraction) => {
        if (!ctx.guild) return;
        let guildid = ctx.guild.id;
        let playlist: WebPlaylist | undefined = idata[ctx.guild.id]?.playlist;
        if (!playlist) return reply(ctx,"Couldn't find webplaylist!")
        switch (ctx.customId) {
            case 'cdownloadcustomskip':
                idata[ctx.guild.id].exclusions.push(idata[ctx.guild.id].index)
            case 'cdownloadcustomkeep':
                idata[ctx.guild.id].index++;
            case 'cdownloadcustom':
                let video = playlist.ytplaylist.items[idata[ctx.guild.id].index];
                if (video) {
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
                // ctx.update({content:"Beginning Download!",embeds:[],components:[]})
            case 'cdownloadall':
                delete idata[ctx.guild.id];
                
                if (!ctx.deferred && ctx.isRepliable()) ctx.deferReply({"ephemeral": true});
                playlist.download(ctx.guild?.id)
                .once('start', (items) => {
                    editReply(ctx,`Downloading: ${items?.length} songs.`)
                }).on('progress', (cur: number, total: number) => {
                    editReply(ctx,`Downloaded: ${cur}/${total} songs.`);
                }).on('finish',(playlist: Playlist | undefined) => {
                    editReply(ctx,`Success! ${playlist ? playlist.playlistdata.items.length : 0} files downloaded (${playlist ? 'total' : 'non-fatal fail'})!`);
                }).on('warn' , (cur: number, total: number, error: Error) => {
                    editReply(ctx,`Downloaded: ${cur}/${total} songs. (Non-Fatal: ${error.message})`)
                }).on('error', (e: Error) => {
                    editReply(ctx,`Error: `+e.message);
                })
            break;
        }
    }
};