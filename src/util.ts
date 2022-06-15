import { BaseCommandInteraction, ButtonInteraction, Interaction, Message, MessageOptions, MessagePayload, InteractionUpdateOptions, MessageActionRow, MessageActionRowComponent, MessageButton, MessageSelectMenu, MessageActionRowOptions } from "discord.js";
import { client } from "./index";
import * as fs from "fs"
import ytpl from "ytpl";

export async function reply(ctx: BaseCommandInteraction | ButtonInteraction | Message, content: MessageOptions | string, eph?: boolean): Promise<void | Message<boolean>> {
    if (!ctx.channel) return;
    if (typeof content === "string") content = {content:content} as MessageOptions;
    content.flags = 64;
    if (ctx instanceof Message) {if (eph) {ctx.author.send(content)} else {ctx.reply(content)}; return;}
    if (ctx.replied) {return editReply(ctx,content)}
    return ctx.reply( MessagePayload.create(ctx,content));
}

export async function editReply(ctx: BaseCommandInteraction | ButtonInteraction | Message, content: MessageOptions | string): Promise<void | Message<boolean>> {
    if (!ctx.channel) return;
    if (typeof content === "string") content = {content:content} as MessageOptions;
    content.flags = 64;
    if (ctx instanceof Interaction) {
        if (!ctx.replied) {return reply(ctx,content)}
        await ctx.editReply(content)
    } else if (ctx instanceof Message) {
        let m: Message | null | undefined = [...ctx.channel.messages.cache.values()].find(msg => client?.user?.id === msg.author.id && msg.reference?.messageId === ctx.id && Date.now()-msg.createdAt.getTime() < 10*1000)
        if (m?.editable) {return m.edit(MessagePayload.create(m,content))}
        await ctx.reply(content);
    }
}

export function disableButtons(ctx: ButtonInteraction, options?: InteractionUpdateOptions): void {
    if (ctx.deferred) return console.warn("Attempted to disable buttons on deferred context.")
    if (!(ctx.message instanceof Message && ctx.message.components && ctx.message.components instanceof Array<MessageActionRow<MessageButton | MessageSelectMenu>>)) return;
    try {
        let jmsg: InteractionUpdateOptions | any = ctx.message;
        if (ctx.message.nonce === null) jmsg.nonce = undefined;
        let audited: InteractionUpdateOptions = {};
        audited = Object.assign(audited,jmsg)
        if (!options?.components) audited.components = ctx.message.components?.map(a=>{
            return new MessageActionRow({components: a.components.map(c=>{
                c.disabled=true;return c as MessageActionRowComponent
            })} as MessageActionRowOptions<MessageActionRowComponent>)
        })
        if (!options?.attachments) audited.attachments = [...ctx.message.attachments.values()]
        if (options) audited = Object.assign(audited,options);
        ctx.update(audited)
    } catch (e) {
        
        console.error(e)
    }
}

export function getPlaylistFiles(gid: string): [MusicJSON, string[]] {
    const dir = `./resources/music/${gid}/`;
    let data: MusicJSON = JSON.parse(fs.readFileSync(dir+"data.json").toString()) ?? {}
    return [data, fs.readdirSync(dir)];
}

export async function setPlaylistFiles(gid: string, data: MusicJSON) {
    const dir = `./resources/music/${gid}/`;
    return fs.promises.writeFile(dir+"data.json",JSON.stringify(data))
}

export function parseVideo(video: ytpl.Item): Song {
    return {
        id: video.id,

        title: "Never Gonna Give You Up",
        artist: "Rick Astley",
        genre: Genre.Pop,
        length: video.durationSec ?? -1,

        score: 0,
    } // FIXME: this
}

export type MusicJSON = {
    [key: string]: SongFile
}

export type SongFile = Song & {file: string}

export type Song = {
    id: string,

    title: string,
    artist: string,
    genre: Genre,
    length: number, // Song Duration (Seconds)

    tags?: Array<string>,
    score: number,
}

export enum Genre {
    Pop       ,// Shake it Off - Taylor Swift
    Meme      ,// Plastic Bag - Paty Kerry
    Minecraft ,// Dragonhearted- TryHardNinja
    EDM       ,// Base After Base - DJVI
    House     ,// 
    Instrumental,// 
    Japanese  ,// Nausicaa on the Valley of the Wind - Joe Hisaishi
    Eurobeat  ,// Running in the 90s
} // Philter, TheFatRat