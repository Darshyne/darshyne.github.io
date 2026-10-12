/**
 * Builds the "What Core automates" pages (automated.html, fr/automatise.html) and updates the counts on index.html.
 *
 * Source of truth: the content table shipped with DAS · Core (`module/scripts/content/index.mjs`, `SHIPPED`) — one entry per
 * dnd5e identifier for which the engine has a rule of its own. Names and categories are looked up in the local Foundry packs
 * (SRD first, then the Player's Handbook, Monster Manual and Ravenloft modules). Only names are written out, never any text.
 *
 *   node tools/build-automated.mjs "../Foundry dnd5e moteur de combat"
 *   node tools/build-fr.mjs
 *
 * Needs the local Foundry V14 data (read through copies, Foundry can stay open) and the engine's node_modules (classic-level).
 */
import { cpSync, mkdirSync, readdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const SITE = resolve(fileURLToPath(import.meta.url), "../..");
const REPO = resolve(process.argv[2] ?? join(SITE, "../Foundry dnd5e moteur de combat"));
const DATA = process.env.FOUNDRY_DATA ?? "F:/Foundry V14/Data";
const { ClassicLevel } = createRequire(join(REPO, "package.json"))("classic-level");

// Count what is committed (pushed) in the engine, not work in progress: read module/ from the last commit.
const ENGINE = mkdtempSync(join(tmpdir(), "das-core-"));
execFileSync("git", ["-C", REPO, "archive", "-o", join(ENGINE, "head.tar"), "HEAD", "module"]);
execFileSync("tar", ["-xf", "head.tar"], { cwd: ENGINE });
const engineCommit = execFileSync("git", ["-C", REPO, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
const content = f => import(pathToFileURL(join(ENGINE, "module/scripts/content", f)).href);

const { SHIPPED } = await content("index.mjs");
const engineVersion = JSON.parse(readFileSync(join(ENGINE, "module/module.json"), "utf8")).version;

// Tables of one class each: an identifier found there is that class's feature (unless the packs say it is a spell or a feat).
const CLASS_TABLES = {
  Barbarian: ["barbarian.mjs", "BARBARIAN"], Bard: ["bard.mjs", "BARD"], Cleric: ["cleric.mjs", "CLERIC"],
  Druid: ["druid.mjs", "DRUID"], Fighter: ["fighter.mjs", "FIGHTER"], Monk: ["monk.mjs", "MONK"],
  Paladin: ["paladin.mjs", "PALADIN"], Ranger: ["ranger.mjs", "RANGER"], Rogue: ["rogue.mjs", "ROGUE"],
  Sorcerer: ["sorcerer.mjs", "SORCERER"], Warlock: ["warlock.mjs", "WARLOCK"], Wizard: ["wizard.mjs", "WIZARD"]
};
const classOf = new Map();
for ( const [cls, [file, name]] of Object.entries(CLASS_TABLES) ) for ( const id of Object.keys((await content(file))[name]) ) classOf.set(id, cls);
const tableOf = new Map();
for ( const [file, name, tag] of [["species.mjs", "SPECIES", "species"], ["feats.mjs", "FEATS", "feat"], ["gear.mjs", "GEAR", "item"],
  ["ravenloft.mjs", "RAVENLOFT", "ravenloft"], ["cantrips.mjs", "CANTRIPS", "spell"], ["spell-rules.mjs", "SPELL_RULES", "spell"]] )
  for ( const id of Object.keys((await content(file))[name]) ) tableOf.set(id, tag);

// Packs, in name priority order.
const PACKS = [
  ["srd", `${DATA}/systems/dnd5e/packs/spells24`], ["srd", `${DATA}/systems/dnd5e/packs/feats24`],
  ["srd", `${DATA}/systems/dnd5e/packs/origins24`], ["srd", `${DATA}/systems/dnd5e/packs/equipment24`],
  ["srd", `${DATA}/systems/dnd5e/packs/monsterfeatures24`],
  ["phb", `${DATA}/modules/dnd-players-handbook/packs/spells`], ["phb", `${DATA}/modules/dnd-players-handbook/packs/feats`],
  ["phb", `${DATA}/modules/dnd-players-handbook/packs/classes`], ["phb", `${DATA}/modules/dnd-players-handbook/packs/origins`],
  ["phb", `${DATA}/modules/dnd-players-handbook/packs/equipment`],
  ["mm", `${DATA}/modules/dnd-monster-manual/packs/features`], ["mm", `${DATA}/modules/dnd-monster-manual/packs/actors`],
  ["rl", `${DATA}/modules/dnd-ravenloft-horrors-within/packs/options`], ["rl", `${DATA}/modules/dnd-ravenloft-horrors-within/packs/items`],
  // 2014 SRD last: only for identifiers the 2024 books don't use (Ki…).
  ["srd", `${DATA}/systems/dnd5e/packs/classfeatures`], ["srd", `${DATA}/systems/dnd5e/packs/spells`],
  ["srd", `${DATA}/systems/dnd5e/packs/monsterfeatures`]
];
const tmp = mkdtempSync(join(tmpdir(), "das-automated-"));
const hits = new Map();                 // identifier → [{ src, type, sub, name, req }]
const subclassClass = new Map();        // subclass name → class name
const classNames = new Map();           // class identifier → class name
let n = 0;
for ( const [src, dir] of PACKS ) {
  if ( !existsSync(dir) ) { console.warn(`missing pack, skipped: ${dir}`); continue; }
  const copy = join(tmp, String(n++));
  mkdirSync(copy, { recursive: true });
  for ( const f of readdirSync(dir) ) if ( f !== "LOCK" ) cpSync(join(dir, f), join(copy, f));
  const db = new ClassicLevel(copy, { valueEncoding: "json" });
  for await ( const [key, it] of db.iterator() ) {
    if ( !/^!(items|actors\.items)!/.test(key) ) continue;
    const s = it.system ?? {};
    if ( it.type === "class" ) classNames.set(s.identifier, it.name);
    if ( it.type === "subclass" ) subclassClass.set(it.name, s.classIdentifier);
    // No identifier (some Ravenloft options): dnd5e falls back on the slug of the name, so does the engine.
    const ident = s.identifier || String(it.name ?? "").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if ( !ident ) continue;
    const list = hits.get(ident) ?? hits.set(ident, []).get(ident);
    list.push({ src, type: it.type, sub: s.type?.value ?? "", name: it.name, req: s.requirements ?? "", level: s.level });
  }
  await db.close();
}
rmSync(tmp, { recursive: true, force: true });

const CLASSES = Object.keys(CLASS_TABLES);
function classFromReq(req) {
  const word = String(req).split(/\s+/)[0];
  if ( CLASSES.includes(word) ) return word;
  const sub = subclassClass.get(String(req).trim());
  return sub ? classNames.get(sub) ?? null : null;
}
const title = id => id.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");

// Second identifiers of a spell already listed: SRD name of a PHB spell, options of one spell.
const SKIP = new Set(["hideous-laughter", "arcane-hand", "forceful-hand", "grasping-hand", "bullseye-lantern"]);

// Identifiers the packs don't place (spells from outside the 2024 books, sub-activities, features without requirements).
const OVERRIDES = {
  "absorb-elements": { cat: "spell", group: 1, name: "Absorb Elements" }, "cause-fear": { cat: "spell", group: 1, name: "Cause Fear" },
  "spirit-shroud": { cat: "spell", group: 3, name: "Spirit Shroud" },
  "umbral-dagger": { cat: "monster" }, "bite": { cat: "monster" }, "slam": { cat: "monster" }, "proboscis": { cat: "monster" },
  "draining-swipe": { cat: "monster" }, "parry": { cat: "monster" }, "parry-maneuver": { cat: "class", group: "Fighter", name: "Parry (maneuver)" },
  "channel-divinity-cleric": { cat: "class", group: "Cleric", name: "Channel Divinity" },
  "flask-of-holy-water": { cat: "item", name: "Holy Water" }, "misty-form": { cat: "monster", name: "Misty Form" },
  "arcane-ward": { cat: "class", group: "Wizard" }, "dark-ones-blessing": { cat: "class", group: "Warlock" }
};

const rows = [];
for ( const id of Object.keys(SHIPPED) ) {
  if ( SKIP.has(id) ) continue;
  const h = hits.get(id) ?? hits.get(id.replace(/-ravenloft$/, "")) ?? [];
  if ( OVERRIDES[id] ) {
    const o = OVERRIDES[id];
    const named = h.find(x => x.type === "spell") ?? h.find(x => x.type === "feat") ?? h[0];
    rows.push({ id, name: o.name ?? named?.name ?? title(id), cat: o.cat, group: o.group });
    continue;
  }
  const pick = pred => h.find(pred);
  const spell = pick(x => x.type === "spell");
  const feat = pick(x => x.type === "feat" && x.sub === "feat");
  const name = (spell ?? feat ?? h[0])?.name ?? title(id);
  let cat, group;
  const tag = tableOf.get(id);
  if ( tag === "ravenloft" ) cat = "ravenloft";
  else if ( spell && !classOf.has(id) || tag === "spell" ) { cat = "spell"; group = spell?.level ?? null; }
  else if ( spell && classOf.has(id) && !pick(x => x.type === "feat") ) { cat = "spell"; group = spell.level; }
  else if ( feat || tag === "feat" ) cat = "feat";
  else if ( classOf.has(id) ) { cat = "class"; group = classOf.get(id); }
  else if ( tag === "species" || pick(x => x.type === "feat" && ["race", "species"].includes(x.sub)) ) cat = "species";
  else if ( tag === "item" || pick(x => ["weapon", "consumable", "equipment", "tool", "loot", "container"].includes(x.type)) ) cat = "item";
  else if ( pick(x => x.type === "feat" && x.sub === "class") ) {
    cat = "class";
    group = h.filter(x => x.sub === "class").map(x => classFromReq(x.req)).find(Boolean) ?? "Other";
  }
  else if ( pick(x => x.src === "rl") ) cat = "ravenloft";
  else if ( pick(x => x.type === "feat" && x.sub === "monster") || pick(x => x.src === "mm") ) cat = "monster";
  else cat = "other";
  rows.push({ id, name, cat, group });
}

// One line per name inside a category (several identifiers can share a name: Uncanny Dodge, Channel Divinity…).
const byCat = {};
for ( const r of rows ) {
  const list = (byCat[r.cat] ??= []);
  if ( !list.some(x => x.name === r.name && x.group === r.group) ) list.push(r);
}
const count = cat => (byCat[cat] ?? []).length;
const counts = { spells: count("spell"), classes: count("class"), feats: count("feat"), species: count("species"),
  monsters: count("monster"), items: count("item"), ravenloft: count("ravenloft"), other: count("other") };
counts.total = Object.values(counts).reduce((a, b) => a + b, 0);

// Mechanics coded into the engine itself rather than tied to one item (runtime/*.mjs). Hand-kept: update with new modules.
const BUILT_IN = {
  en: ["Weapon Mastery properties", "Opportunity attacks, before the move", "Cover and line of sight", "Grappling and shoving",
    "Hiding, Search and passive Perception", "Help (attack and ability checks)", "Concentration", "Death saving throws and stabilizing",
    "Prone, crawling and standing up", "Wild Shape", "Metamagic", "Bardic Inspiration and other aid dice", "Superiority dice (Battle Master)",
    "Smites", "Summons and familiars", "Potions and spell scrolls", "Carried light sources (torches, lamps, lanterns)",
    "Legendary actions and resistances", "Doors and locks"],
  fr: ["Bottes d'arme (maîtrises)", "Attaques d'opportunité, avant le déplacement", "Abris et ligne de vue", "Empoigner et pousser",
    "Se cacher, Fouille et Perception passive", "Aider (attaques et tests)", "Concentration", "Jets contre la mort et stabilisation",
    "À terre, ramper, se relever", "Forme sauvage", "Métamagie", "Inspiration bardique et autres dés d'aide", "Dés de supériorité (Maître de guerre)",
    "Châtiments", "Invocations et familiers", "Potions et parchemins de sort", "Sources de lumière portées (torches, lampes, lanternes)",
    "Actions et résistances légendaires", "Portes et serrures"]
};

const T = {
  en: {
    lang: "en", file: "automated.html", other: "fr/automatise.html", otherLang: "fr", otherLabel: "FR", home: "./", root: "",
    title: "What Core automates · Darshyne's Automation Suite",
    desc: "Every spell, feature and item DAS · Core has a rule of its own for, generated from its source code.",
    eyebrow: "What Core automates", h1: "Rules written for D&amp;D 2024",
    intro: `Any spell, feature or monster ability is played from dnd5e's own data: attack roll, saving throw, damage, healing, effects. That is why
      Fireball, Bless or Cure Wounds are not listed here: they need nothing more. The lists below are what the data alone can't do, and what
      Core adds on top: <strong>${counts.total} rules</strong> keyed to dnd5e identifiers, so they apply to any creature, player character or monster.`,
    beta: `<strong>DAS is in beta.</strong> Not every spell and feature is covered yet: some still need a click or a roll by hand.`,
    source: `Generated from the source code of DAS · Core ${engineVersion}. Names from the SRD 5.2, the Player's Handbook, the Monster Manual
      and Ravenloft: The Horrors Within (names only: the books and their modules are not included).`,
    builtIn: "Built into the engine", builtInNote: "Coded into the engine itself, for every creature, rather than tied to one item.",
    spells: "Spells", level: l => l === 0 ? "Cantrips" : `Level ${l}`, classes: "Class features", feats: "Feats", species: "Species traits",
    monsters: "Monster abilities", items: "Items", ravenloft: "Ravenloft: The Horrors Within", other: "Other",
    other_classes: "Other", back: "← Back to the main page", missing: "Something missing or wrong?",
    report: "Tell us on Discord", or: "or", issue: "open an issue"
  },
  fr: {
    lang: "fr", file: "fr/automatise.html", other: "../automated.html", otherLang: "en", otherLabel: "EN", home: "./", root: "../",
    title: "Ce que le Core automatise · Darshyne's Automation Suite",
    desc: "Tous les sorts, aptitudes et objets pour lesquels DAS · Core a une règle à lui, relevés dans son code source.",
    eyebrow: "Ce que le Core automatise", h1: "Des règles écrites pour D&amp;D 2024",
    intro: `Tout sort, toute aptitude ou capacité de monstre se joue à partir des données de dnd5e : jet d'attaque, jet de sauvegarde, dégâts,
      soins, effets. C'est pour ça que Boule de feu, Bénédiction ou Soins ne figurent pas ici : ils n'ont besoin de rien de plus. Les listes
      ci-dessous, c'est ce que les données ne savent pas faire seules et que le Core ajoute : <strong>${counts.total} règles</strong> rattachées
      aux identifiants de dnd5e, valables pour toute créature, personnage joueur ou monstre.`,
    beta: `<strong>DAS est en bêta.</strong> Tous les sorts et toutes les aptitudes ne sont pas encore couverts : certains demandent encore un clic ou un jet à la main.`,
    source: `Relevé dans le code source de DAS · Core ${engineVersion}. Les noms sont ceux, en anglais, du SRD 5.2, du Player's Handbook, du
      Monster Manual et de Ravenloft: The Horrors Within (les noms seulement : ni les livres ni leurs modules ne sont fournis).`,
    builtIn: "Intégré au moteur", builtInNote: "Codé dans le moteur lui-même, pour toutes les créatures, sans dépendre d'un objet en particulier.",
    spells: "Sorts", level: l => l === 0 ? "Sorts mineurs" : `Niveau ${l}`, classes: "Aptitudes de classe", feats: "Dons", species: "Traits d'espèce",
    monsters: "Capacités de monstres", items: "Objets", ravenloft: "Ravenloft: The Horrors Within", other: "Divers",
    other_classes: "Autres", back: "← Retour à la page principale", missing: "Un oubli, une erreur ?",
    report: "Dites-le sur Discord", or: "ou", issue: "ouvrez un ticket"
  }
};
const CLASS_FR = { Barbarian: "Barbare", Bard: "Barde", Cleric: "Clerc", Druid: "Druide", Fighter: "Guerrier", Monk: "Moine",
  Paladin: "Paladin", Ranger: "Rôdeur", Rogue: "Roublard", Sorcerer: "Ensorceleur", Warlock: "Occultiste", Wizard: "Magicien", Other: "Autres" };

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const byName = (a, b) => a.name.localeCompare(b.name, "en");
const list = items => `<ul class="names">${items.sort(byName).map(r => `<li>${esc(r.name)}</li>`).join("")}</ul>`;

function page(t) {
  const groups = (cat, label, order) => {
    const items = byCat[cat] ?? [];
    const keys = [...new Set(items.map(r => r.group))].sort(order);
    return keys.map(k => `<h4>${label(k)} <span class="n">${items.filter(r => r.group === k).length}</span></h4>${list(items.filter(r => r.group === k))}`).join("");
  };
  const block = (cat, inner) => (byCat[cat]?.length ? `
    <section id="${cat}">
      <h2>${t[cat === "spell" ? "spells" : cat === "class" ? "classes" : cat === "feat" ? "feats" : cat === "monster" ? "monsters" : cat === "item" ? "items" : cat]} <span class="n">${count(cat)}</span></h2>
      ${inner ?? list(byCat[cat])}
    </section>` : "");
  const spellGroups = groups("spell", l => t.level(l ?? 0), (a, b) => (a ?? 0) - (b ?? 0));
  const classGroups = groups("class", c => t.lang === "fr" ? CLASS_FR[c] ?? c : (c === "Other" ? t.other_classes : c),
    (a, b) => (a === "Other") - (b === "Other") || String(a).localeCompare(String(b)));
  const toc = [["spell", t.spells], ["class", t.classes], ["feat", t.feats], ["species", t.species], ["monster", t.monsters], ["item", t.items], ["ravenloft", t.ravenloft], ["other", t.other]]
    .filter(([c]) => count(c)).map(([c, l]) => `<a href="#${c}">${l} <span class="n">${count(c)}</span></a>`).join("");
  return `<!doctype html>
<html lang="${t.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${t.title}</title>
<meta name="description" content="${t.desc}">
<meta name="color-scheme" content="light dark">
<link rel="alternate" hreflang="en" href="https://darshyne.github.io/automated.html">
<link rel="alternate" hreflang="fr" href="https://darshyne.github.io/fr/automatise.html">
<link rel="icon" type="image/png" sizes="32x32" href="${t.root}img/icon-32.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Marcellus&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
/* Generated by tools/build-automated.mjs — do not edit by hand. */
:root {
  --bg: #e9ecf2; --surface: #f6f7fa; --ink: #1b2130; --muted: #5a6275; --line: #c9cfdb; --gold: #b0004f; --arcane: #2f6f7a;
  --display: "Marcellus", Georgia, serif; --body: "IBM Plex Sans", "Segoe UI", system-ui, sans-serif; color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --bg: #12161f; --surface: #1a202c; --ink: #e6e8ee; --muted: #9aa2b4; --line: #2c3444; --gold: #ff4d8d; --arcane: #5fb3be; color-scheme: dark; }
}
:root[data-theme="dark"] { --bg: #12161f; --surface: #1a202c; --ink: #e6e8ee; --muted: #9aa2b4; --line: #2c3444; --gold: #ff4d8d; --arcane: #5fb3be; color-scheme: dark; }
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 400 1rem/1.6 var(--body); }
.wrap { max-width: 1080px; margin: 0 auto; padding-inline: 16px; }
a { color: var(--gold); }
a:focus-visible { outline: 2px solid var(--arcane); outline-offset: 2px; }
h1, h2, h4 { font-family: var(--display); font-weight: 400; margin: 0; text-wrap: balance; }
h1 { font-size: clamp(2rem, 5vw, 3rem); line-height: 1.1; margin-top: 10px; }
h2 { font-size: clamp(1.5rem, 3vw, 2rem); }
h4 { font-size: 1.1rem; margin: 22px 0 8px; color: var(--muted); }
.n { font: 500 .8em var(--body); color: var(--gold); font-variant-numeric: tabular-nums; }
nav { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding-block: 18px; flex-wrap: wrap; }
nav .lang { border: 1px solid var(--line); border-radius: 3px; padding: 0 8px; font-weight: 600; letter-spacing: .06em; color: var(--muted); text-decoration: none; }
.eyebrow { font: 600 .74rem/1 var(--body); letter-spacing: .14em; text-transform: uppercase; color: var(--gold); }
header { padding-block: 32px 40px; }
header p { color: var(--muted); max-width: 70ch; margin: 16px 0 0; }
header p strong { color: var(--ink); }
.beta-note { padding: 12px 16px; border-left: 3px solid var(--gold); background: var(--surface); color: var(--ink) !important; }
.toc { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px; }
.toc a { border: 1px solid var(--line); border-radius: 999px; padding: 4px 12px; text-decoration: none; color: var(--ink); background: var(--surface); font-size: .92rem; }
section { padding-block: 40px; border-top: 1px solid var(--line); }
.names { list-style: none; padding: 0; margin: 12px 0 0; columns: 3 220px; column-gap: 28px; }
.names li { break-inside: avoid; padding: 3px 0; border-bottom: 1px dotted var(--line); }
.note { color: var(--muted); margin-top: 8px; }
footer { border-top: 1px solid var(--line); padding-block: 32px 48px; color: var(--muted); font-size: .9rem; display: grid; gap: 10px; }
</style>
</head>
<body>
<div class="wrap">
  <nav>
    <a href="${t.home}">${t.back}</a>
    <a class="lang" href="${t.other}" hreflang="${t.otherLang}" lang="${t.otherLang}">${t.otherLabel}</a>
  </nav>
  <header>
    <span class="eyebrow">${t.eyebrow}</span>
    <h1>${t.h1}</h1>
    <p>${t.intro}</p>
    <p class="beta-note">${t.beta}</p>
    <div class="toc">${toc}<a href="#built-in">${t.builtIn}</a></div>
  </header>
  ${block("spell", spellGroups)}
  ${block("class", classGroups)}
  ${block("feat")}
  ${block("species")}
  ${block("monster")}
  ${block("item")}
  ${block("ravenloft")}
  ${block("other")}
  <section id="built-in">
    <h2>${t.builtIn}</h2>
    <p class="note">${t.builtInNote}</p>
    <ul class="names">${BUILT_IN[t.lang].map(x => `<li>${x}</li>`).join("")}</ul>
  </section>
  <footer>
    <p>${t.missing} <a href="https://discord.gg/PDSq8dYdTP">${t.report}</a> ${t.or} <a href="https://github.com/Darshyne/dnd5e-combat/issues">${t.issue}</a>.</p>
    <p>${t.source}</p>
  </footer>
</div>
</body>
</html>
`;
}

writeFileSync(join(SITE, "automated.html"), page(T.en));
writeFileSync(join(SITE, "fr/automatise.html"), page(T.fr));

// Counts on the main page: <strong data-count="spells">160</strong>. build-fr.mjs copies them as they are.
const indexPath = join(SITE, "index.html");
let index = readFileSync(indexPath, "utf8");
let patched = 0;
index = index.replace(/(<strong data-count="(\w+)">)[^<]*(<\/strong>)/g, (m, open, key, close) => {
  if ( !(key in counts) ) return m;
  patched++;
  return open + counts[key] + close;
});
writeFileSync(indexPath, index);

rmSync(ENGINE, { recursive: true, force: true });
console.log(`Core ${engineVersion} (${engineCommit}): ${JSON.stringify(counts)}; ${patched} counts updated on index.html`);
if ( byCat.other?.length ) console.log("other:", byCat.other.map(r => r.id).join(" "));
const unsorted = (byCat.class ?? []).filter(r => r.group === "Other");
if ( unsorted.length ) console.log("class features without a class:", unsorted.map(r => r.id).join(" "));
