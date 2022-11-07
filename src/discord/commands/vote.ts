import { ApplicationCommandOptionType, CommandInteraction, GuildMember, Message } from "discord.js"
import { ERRORS, Song } from "../../constants"
import { Playlist } from "../../web/playlist"
import { getPlayer, getPlaying, truncateString } from "../util"
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
            {name:"Up",  value:  "up"},
            {name:"Down",value:"down"}
        ]
    }],
    defaultMemberPermissions: "PrioritySpeaker",
    public: true,
    
    run: async (ctx: CommandInteraction, {vote}: {vote: "up" | "down"}) => {
        if (!ctx.guild || !ctx.member) return Promise.reject(ERRORS.NO_GUILD);
        if (!("voice" in ctx.member)) return Promise.reject(ERRORS.NO_CONNECTION);
        const uid = ctx.user.id;
        if (voted[ctx.guild.id]?.has(uid)) return ctx.reply({content: "You've already voted!",ephemeral:true});
        // Argument Processing
        const me: GuildMember = await ctx.guild.members.fetchMe();
        if (!ctx.member.voice || ctx.member.voice.channelId !== me.voice.channelId || ctx.member.voice.deaf || me.voice.serverMute) return ctx.reply({content:"You aren't even listening to the music!", ephemeral: true});
        // Playlist Locating
        let playlist = Playlist.getPlaylist(ctx.guild.id)
        if (!playlist) return ctx.reply({content:ERRORS.NO_PLAYLIST,ephemeral:true});
        let song: Song | undefined = getPlaying(getPlayer(ctx.guild.id,false))
        if (!song) return ctx.reply({content:ERRORS.NO_SONG,ephemeral:true});
        // Action Execution
        if (!voted[ctx.guild.id]) voted[ctx.guild.id] = new Set<string>();
        voted[ctx.guild.id].add(uid);
        playlist.vote(song.id, vote==="up");
        return ctx.reply({ ephemeral: true,
            content: `${vote[0].toUpperCase()+vote.slice(1)}voted '${truncateString(song.title,17)}' [\`${song.id}\`] (${playlist.getSongs.find(i=>i.id===song?.id)?.score} score)`
        });
    }
}