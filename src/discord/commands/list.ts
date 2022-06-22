import { MessageOptions, BaseCommandInteraction, Interaction, Message, MessageActionRow, MessageActionRowComponent, MessageComponentInteraction, MessageEmbed, InteractionUpdateOptions, EmbedField } from "discord.js";
import { MusicJSON, RealSong } from "../../youtube/util";
import { client } from "../../index";
import { reply, truncateString } from "../util";
import { Command } from "./Commands";
import { getPlaylist } from "../../youtube/playlist";

export const List: Command = {
    name: "list",
    description: "Lists music on your playlist.",
    type: "CHAT_INPUT",
    public: true,
    options: [{
        name: "name",
        description: "Term to search for",
        type: 3, // string
        required: false,
    }],


    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild) return;
        let arg1: string | undefined;
        if (ctx instanceof BaseCommandInteraction) {
            arg1 = ctx.options.get("name",false)?.value?.toString()
        } else {
            arg1 = ctx.content.split(" ").slice(2).join(" ");
        }

        let options: GetMessageOptions = {};
        if (arg1 === "top") {options.filter = (a:RealSong)=>a.score>0; options.sort = (a:RealSong,b:RealSong)=>b.score-a.score;}
        else if (arg1) {options.filter = (i:RealSong)=>i.title.includes(arg1 ?? "")}

        let m: MessageOptions;
        if ((m = getMessage<MessageOptions>(ctx,options))) reply(ctx,m);
    },

    interact: async (ctx: MessageComponentInteraction) => {
        if (!ctx.guild) return;
        let page: number = 0;
        if (ctx.message.embeds.length > 0) {
            page = Number.parseInt(ctx.message.content) || 0
        }
        switch (ctx.customId) {
            case 'clistpageup':
                ctx.update(getMessage<InteractionUpdateOptions>(ctx, undefined, page+1))
                break;
            case 'clistpagedown':
                ctx.update(getMessage<InteractionUpdateOptions>(ctx, undefined, page-1))
                break;
        }
    }
};

type GetMessageOptions = {
    filter?: (value: RealSong, index: number, array: RealSong[]) => unknown,
    sort?: (a: RealSong, b: RealSong) => number
}

function getMessage<T extends MessageOptions | InteractionUpdateOptions>(ctx: Interaction | Message, options?: GetMessageOptions, page = 0): T {
    if (!ctx.guild) return {content:"Couldn't find guild!"} as T;
    try {
        var playlistdata: MusicJSON = getPlaylist(ctx.guild.id).playlistdata;
    } catch (e) { return {content:"Couldn't find playlist!"} as T; }
    if (options?.filter) playlistdata.items = playlistdata.items.filter(options.filter);
    if (options?.sort) playlistdata.items = playlistdata.items.sort(options.sort);
    return {
        "content": page.toString(),
        "components": [{"type": "ACTION_ROW","components": [
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
                "disabled": page >= Math.floor(playlistdata.items.length/25),
                "type": "BUTTON"
            } as MessageActionRowComponent,
                {
                "style": "DANGER",
                "label": "Cancel",
                "customId": "cancel",
                "disabled": false,
                "type": "BUTTON"
            } as MessageActionRowComponent,
        ]} as MessageActionRow],
        "embeds": [{
            "type": "rich",
            "title": `${options?.sort ? "Top" : "All"} ${options?.filter ? "Results" : "Songs"} (${playlistdata.items.length})`,
            "description": `${ctx.guild.name.length > 20 ? ctx.guild.nameAcronym : ctx.guild.name} Server Playlist`,
            "color": 0xff0000,
            "fields": playlistdata.items.slice(page*25,page*25+25).map(s => {return {
                "name": options?.sort ? `[${s.score} Score] ${truncateString(s.title,25)}` : s.title,
                "value": s.id,
                "inline": true,
            } as EmbedField}) || {"name": "No Results", "value": "Out Of Bounds", "inline": false} as EmbedField,
            "footer": {
                "text": `PlaylistDJ - Song List - Page ${page+1}/${Math.ceil(playlistdata.items.length/25)}`,
                "iconURL": client.user?.avatarURL() ?? ""
            }
        } as MessageEmbed]
    } as T
}