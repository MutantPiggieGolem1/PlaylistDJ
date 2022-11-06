import { ApplicationCommandOptionChoiceData, ApplicationCommandOptionData, ApplicationCommandOptionType, ApplicationCommandSubCommandData, ApplicationCommandSubGroupData, AutocompleteInteraction, ChatInputApplicationCommandData, CommandInteraction } from "discord.js"
import { Admin } from "./admin"
import { Join } from "./join"
import { KickMe } from "./kickme"
import { Leave } from "./leave"
import { Play } from "./play"
import { Playing } from "./playing"
import { Playlist } from "./playlist"
import { Rickroll } from "./rickroll"
import { Vote } from "./vote"

export interface Command extends ChatInputApplicationCommandData {
    public: boolean;
    options?: ApplicationCommandOptionData[];
    run(ctx: CommandInteraction, args?: {}): Promise<any>; // TODO: Objective typing
    ac?(ctx: AutocompleteInteraction): ApplicationCommandOptionChoiceData[] | Promise<ApplicationCommandOptionChoiceData[]> | Error | null;
}
export interface SubCommand extends ApplicationCommandSubCommandData {
    type: ApplicationCommandOptionType.Subcommand;
    public: boolean;
    run(ctx: CommandInteraction, args?: {}): Promise<any>;
    ac?: (ctx: AutocompleteInteraction) => ApplicationCommandOptionChoiceData[] | Promise<ApplicationCommandOptionChoiceData[]> | Error | null;
}
export interface SubCommandGroup extends ApplicationCommandSubGroupData {
    type: ApplicationCommandOptionType.SubcommandGroup;
    public: boolean;
    run(ctx: CommandInteraction): Promise<any>;
    ac?: (ctx: AutocompleteInteraction) => ApplicationCommandOptionChoiceData[] | Promise<ApplicationCommandOptionChoiceData[]> | Error | null;
}

export const Commands: Command[] = [
    Admin, Playlist, // Management Commands
    Join,Leave,Play,Playing,KickMe,Vote, // Public Commands
    Rickroll,
]