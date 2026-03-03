#!/usr/bin/env node
import { Cli } from "incur"
import { whitelist } from "./commands/whitelist.js"
import { read } from "./commands/read.js"
import { skl } from "./commands/skl.js"
import { ima } from "./commands/ima.js"
import { manager } from "./commands/manager.js"

const cli = Cli
  .create("skale", {
    description: "SKALE Network CLI - read contract data from SKALE chains and Ethereum",
    version: "0.2.0",
  })
  .command(whitelist)
  .command(read)
  .command(skl)
  .command(ima)
  .command(manager)

cli.serve()
