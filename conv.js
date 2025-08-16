import * as fs from "fs"

import { remark } from "remark"
import gfm from "remark-gfm"

// ---------------------------------------------------------------

const readFileSync = (path) => fs.readFileSync(path, "utf-8")

const core = remark().use(gfm)
const parseMD = (txt) => core.parse(txt)

// TODO the output is simple AST, please write a simple function as plugin
// to support [[note reference]] feature

// --------------------------------------------------------------

let ast = parseMD(readFileSync("./README.md"))
console.dir(ast, { depth: null })
