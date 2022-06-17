import { BaseCommandInteraction, ChatInputApplicationCommandData, Message, MessageComponentInteraction } from "discord.js";
import { Download } from "./download";
import { Join } from "./join";
import { Leave } from "./leave";
import { Play } from "./play";
import { Rickroll } from "./rickroll";
import { Delete } from "./delete";
import { List } from "./list";
import { Auth } from "./auth";

export interface Command extends ChatInputApplicationCommandData {
    public: boolean;
    run(ctx: BaseCommandInteraction | Message): void;
    interact?(ctx: MessageComponentInteraction): void;
}
export const Commands: Command[] = [Auth,Delete,Download,Join,Leave,List,Play,Rickroll]; // Pause