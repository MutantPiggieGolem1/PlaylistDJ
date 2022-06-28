import { ApplicationCommandSubCommandData, ApplicationCommandSubGroupData, BaseCommandInteraction, ChatInputApplicationCommandData, Message, MessageComponentInteraction } from "discord.js";
import { Admin } from "./admin";
import { Join } from "./join";
import { Leave } from "./leave";
import { Play } from "./play";
import { Playlist } from "./playlist";
import { Rickroll } from "./rickroll";
import { Vote } from "./vote";

export interface Command extends ChatInputApplicationCommandData {
    public: boolean;
    run(ctx: BaseCommandInteraction | Message): void;
}
export interface SubCommand extends ApplicationCommandSubCommandData {
    type: "SUB_COMMAND";
    public: boolean;
    run(ctx: BaseCommandInteraction | Message): void;
}
export interface SubCommandGroup extends ApplicationCommandSubGroupData {
    type: "SUB_COMMAND_GROUP";
    public: boolean;
    run(ctx: BaseCommandInteraction | Message): void;
}

export const Commands: Command[] = [
    Admin, Playlist,      // Management Commands
    Join,Leave,Play,Vote, // Public Commands
    Rickroll,
]