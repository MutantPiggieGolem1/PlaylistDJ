import { ApplicationCommandOptionType, CommandInteraction, GuildMember, Message } from "discord.js"
import { Playlist } from "../../youtube/playlist"
import { Song } from "../../youtube/util"
import { error, ERRORS, getPlayer, getPlaying, reply, truncateString } from "../util"
import { Command } from "./Commands"

const voted: {[key:string]: Set<String>} = {};
export function resetVotes(gid: string) {voted[gid]?.clear()}

export const Vote: Command = {
    name: "vote",
    description: "Casts a vote on the current song.",
    options: [{
        name: "vote",
        description: "Upvote or downvote?",
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
            {name:"Up",value:"up"},
            {name:"Down",value:"down"}
        ]
    }],
    defaultMemberPermissions: "PrioritySpeaker",
    public: true,
    
    run: async (ctx: CommandInteraction | Message) => {
        if (!ctx.guild || !(ctx.member instanceof GuildMember)) return;
        if (voted[ctx.guild.id]?.has(ctx.member.user.id)) return error(ctx,new Error("You've already voted!"));
        // Argument Processing
        let arg1: string | undefined = (ctx instanceof CommandInteraction ?
            ctx.options.get("vote",true).value?.toString() :
            ctx.content.split(/\s+/g)[2])?.toLowerCase()
        if (!arg1 || !["up","down"].includes(arg1)) return error(ctx, ERRORS.INVALID_ARGUMENTS);
        const me: GuildMember = await ctx.guild.members.fetchMe();
        if (!ctx.member.voice || ctx.member.voice.channelId !== me.voice.channelId || ctx.member.voice.deaf || me.voice.serverMute) return error(ctx,new Error("You aren't even listening to the music!"))
        // Playlist Locating
        let playlist = Playlist.getPlaylist(ctx.guild.id)
        if (!playlist) return error(ctx,ERRORS.NO_PLAYLIST);
        let song: Song | undefined = getPlaying(getPlayer(ctx.guild.id,false))
        if (!song) return error(ctx,ERRORS.NO_SONG);
        // Action Execution
        if (!voted[ctx.guild.id]) voted[ctx.guild.id] = new Set<string>();
        voted[ctx.guild.id].add(ctx.member.user.id);
        playlist.vote(song.id,arg1==="up");
        reply(ctx,`${arg1[0].toUpperCase()+arg1.slice(1)}voted '${truncateString(song.title,17)}' [\`${song.id}\`] (${playlist.getSongs.find(i=>i.id===song?.id)?.score} score)`)
    }
}