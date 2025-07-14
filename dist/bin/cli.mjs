#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/bin/cli.ts
import { debuglog } from "util";

// src/main.ts
async function add(arg1, arg2) {
  return Promise.resolve(arg1 + arg2);
}
__name(add, "add");

// src/bin/cli.ts
var debug = debuglog("agent-rules");
async function init() {
  const sum = await add(1, 2);
  debug(sum.toString());
}
__name(init, "init");
init();
