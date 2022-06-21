import { BaseCommandInteraction, GuildMember, Message} from "discord.js";
import { getPlaylist, Playlist } from "../../youtube/playlist";
import { RealSong } from "../../youtube/util";
import { getPlayer, reply, truncateString } from "../util";
import { Command } from "./Commands";

const voted: {[key:string]: Set<String>} = {};
export function resetVotes(gid: string) {voted[gid]?.clear()}

export const Vote: Command = {
    name: "vote",
    description: "Casts a vote on the current song.",
    type: "CHAT_INPUT",
    public: true,
    options: [{
        name: "vote",
        description: "Upvote or downvote?",
        type: "STRING",
        required: true,
    }],

    run: async (ctx: BaseCommandInteraction | Message) => {
        if (!ctx.guild || !(ctx.member instanceof GuildMember)) return;
        if (voted[ctx.guild.id]?.has(ctx.member.user.id)) return reply(ctx,"You've already voted!");
        let arg1: string | undefined = (ctx instanceof BaseCommandInteraction ?
            ctx.options.get("vote",true).value?.toString() :
            ctx.content.split(/\s+/g)[2])?.toLowerCase()
        if (!arg1 || !["up","down"].includes(arg1)) return reply(ctx,"Invalid Arguments!");
        if (!ctx.member.voice || ctx.member.voice.channelId !== ctx.guild.me?.voice.channelId || ctx.member.voice.deaf || ctx.guild.me.voice.serverMute) return reply(ctx,"You aren't listening to the music!")
        try {
            var playlist: Playlist = getPlaylist(ctx.guild.id);
        } catch { return reply(ctx, "Couldn't find playlist!") }
        let song: RealSong | undefined = getPlayer(ctx.guild.id,false)?.playing
        if (!song) return reply(ctx,"Couldn't find song!")
        
        if (!voted[ctx.guild.id]) voted[ctx.guild.id] = new Set<string>();
        voted[ctx.guild.id].add(ctx.member.user.id);
        playlist.vote(song.id,arg1==="up");
        reply(ctx,`${arg1[0].toUpperCase()+arg1.slice(1)}voted '${truncateString(song.title,17)}' [\`${song.id}\`] (${playlist.playlistdata.items.find(i=>i.id===song?.id)?.score} score)`)
    }
}