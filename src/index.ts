#!/usr/bin/env node
import { Cli } from "incur"
import { read } from "./commands/read.js"
import { token } from "./commands/token.js"
import { access } from "./commands/access.js"
import { ima } from "./commands/ima.js"
import { manager } from "./commands/manager.js"
import { bite } from "./commands/bite.js"
import { txprep } from "./commands/txprep.js"
import { wallet } from "./commands/wallet.js"
import { gas } from "./commands/gas.js"
import { explorer } from "./commands/explorer.js"
import { chains } from "./commands/chains.js"
import { contract } from "./commands/contract.js"

const cli = Cli
  .create("skale", {
    description: "SKALE Network CLI - read contract data from SKALE chains and Ethereum",
    version: "0.2.0",
  })
  .command(read)
  .command(token)
  .command(access)
  .command(ima)
  .command(manager)
  .command(bite)
  .command(txprep)
  .command(wallet)
  .command(gas)
  .command(explorer)
  .command(chains)
  .command(contract)

cli.serve()
