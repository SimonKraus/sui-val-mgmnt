#!/usr/bin/env bun
import { Command } from "commander";
import { registerSuiCommands } from "./commands/sui.js";
import { registerWalrusCommands } from "./commands/walrus.js";
import { registerIkaCommands } from "./commands/ika.js";

const program = new Command()
  .name("mirai-scripts")
  .description("Studio Mirai's frequently used Sui ecosystem operations")
  .version("1.0.0");

registerSuiCommands(program);
registerWalrusCommands(program);
registerIkaCommands(program);

await program.parseAsync();
