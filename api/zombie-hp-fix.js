// HP fix patch - apply to zombie.js
// This file is a hotfix that wraps the explore endpoint to check HP
// It will be merged into zombie.js

// The bug: c.hp||100 treats 0 as falsy, so HP=0 becomes HP=100
// Fix: use (c.hp != null ? c.hp : 100) or simply check the DB value directly

// Also: HP<=0 should block exploration
