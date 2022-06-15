import { MessageOptions, BaseCommandInteraction, Interaction, Message, MessageActionRow, MessageActionRowComponent, MessageButton, MessageComponentInteraction, MessageEmbed, MessageSelectOptionData, InteractionUpdateOptions, EmbedField } from "discord.js";
import { client } from "../index";
import { getPlaylistFiles, MusicJSON, reply } from "../util";
import { Command } from "./Commands";

export const List: Command = {
    name: "list",
    description: "Lists music on your playlist.",
    type: "CHAT_INPUT",

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;

        let m: MessageOptions;
        if ((m = getMessage<MessageOptions>(ctx))) reply(ctx,m);
    },

    interact: async (ctx: MessageComponentInteraction) => {
        if (!ctx.guild) return;
        let page: number = 0;
        if (ctx.message.embeds.length > 0) {
            page = Number.parseInt(ctx.message.embeds[0].footer?.text.replaceAll(/\D/g,"") ?? "") || 0
        }
        switch (ctx.customId) {
            case 'clistpageup':
                ctx.update(getMessage<InteractionUpdateOptions>(ctx, page+1))
                break;
            case 'clistpagedown':
                ctx.update(getMessage<InteractionUpdateOptions>(ctx, page-1))
                break;
        }
    }
};

function getMessage<T extends MessageOptions | InteractionUpdateOptions>(ctx: Interaction | Message, page = 0): T {
    if (!ctx.guild) return {content:"Couldn't find guild!"} as T;
    let playlistdata: MusicJSON;
    try {
        playlistdata = getPlaylistFiles(ctx.guild.id)[0];
    } catch (e) { console.error(e); return {content:"Couldn't find playlist!"} as T; }
    return {
        "content": "_",
        "components": [
            {
                "type": "ACTION_ROW",
                "components": [
                    {
                        "style": "PRIMARY",
                        "label": `Prev Page`,
                        "customId": `clistpagedown`,
                        "disabled": page <= 0,
                        "type": "BUTTON"
                    } as MessageActionRowComponent,
                    {
                        "style": "PRIMARY",
                        "label": `Next Page`,
                        "customId": `clistpageup`,
                        "disabled": page >= Math.floor(Object.keys(playlistdata).length/25),
                        "type": "BUTTON"
                    } as MessageActionRowComponent,
                    {
                        "style": "DANGER",
                        "label": "Cancel",
                        "customId": "cancel",
                        "disabled": false,
                        "type": "BUTTON"
                    } as MessageActionRowComponent,
                ]
            } as MessageActionRow
        ],
        "embeds": [
            {
                "type": "rich",
                "title": `All Songs (${Object.keys(playlistdata).length})`,
                "description": `${ctx.guild.name.length > 16 ? ctx.guild.nameAcronym : ctx.guild.name} Server Playlist`,
                "color": 0xff0000,
                "fields": Object.values(playlistdata).slice(page*25,page*25+25).map(s => {return {
                    "name": s.title,
                    "value": s.id,
                    "inline": true,
                } as EmbedField}),
                "footer": {
                    "text": `PlaylistDJ - Song List - Page ${page}`,
                    "iconURL": client.user?.avatarURL() ?? ""
                }
            } as MessageEmbed
        ]
    } as T
}