import { ApplicationCommandSubCommandData, BaseCommandInteraction, ChatInputApplicationCommandData, Message, MessageComponentInteraction } from "discord.js";
import { Auth } from "./auth";
import { Delete } from "./delete";
import { Join } from "./join";
import { Leave } from "./leave";
import { Play } from "./play";
import { Playlist } from "./playlist";
import { Rickroll } from "./rickroll";
import { Vote } from "./vote";

export interface Command extends ChatInputApplicationCommandData {
    public: boolean;
    run(ctx: BaseCommandInteraction | Message): void;
    interact?(ctx: MessageComponentInteraction): void;
}
export interface SubCommand extends ApplicationCommandSubCommandData {
    type: "SUB_COMMAND";
    public: boolean;
    run(ctx: BaseCommandInteraction | Message): void;
    interact?(ctx: MessageComponentInteraction): void;
}

export const Commands: Command[] = [
    Auth,Delete,Rickroll, // Admin Commands
    Playlist,             // Management Commands [Playlist **MUST** Precede Play in order for interaction seeking to work]
    Join,Leave,Play,Vote, // Public Commands
]