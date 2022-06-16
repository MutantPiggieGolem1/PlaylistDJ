import { BaseCommandInteraction, ChatInputApplicationCommandData, Message, MessageComponentInteraction } from "discord.js";
import { Download } from "./download";
import { Join } from "./join";
import { Leave } from "./leave";
import { Play } from "./play";
import { Rickroll } from "./rickroll";
import { Delete } from "./delete";
import { List } from "./list";
import { Auth } from "./auth";
import { Reload } from "./reload";

export interface Command extends ChatInputApplicationCommandData {
    run(ctx: BaseCommandInteraction | Message): void;
    interact?(ctx: MessageComponentInteraction): void;
}
export const Commands: Command[] = [Auth,Delete,Download,Join,Leave,List,Play,Reload,Rickroll]; // Pause