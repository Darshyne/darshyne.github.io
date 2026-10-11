// Builds the French page fr/index.html from index.html: node tools/build-fr.mjs
// Every English string below must still be found in index.html: if one changed, the script stops and names it,
// so the French page never silently keeps English text. Run it again after any change to index.html.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let html = fs.readFileSync(path.join(root, "index.html"), "utf8");

// [English, French]. Order matters only where one string contains another (longest first).
const T = [
  // <head>
  ['<html lang="en">', '<html lang="fr">'],
  [`<meta name="description" content="Baldur's Gate 3-style combat for Foundry VTT and D&amp;D 2024: click to move, click to attack, react on your own screen. Six free, open-source modules.">`,
   `<meta name="description" content="Le combat façon Baldur's Gate 3 pour Foundry VTT et D&amp;D 2024 : cliquer pour se déplacer, cliquer pour attaquer, réagir sur son propre écran. Six modules gratuits et open source.">`],
  [`<meta property="og:description" content="Baldur's Gate 3-style combat for Foundry VTT and D&amp;D 2024. Free and open source.">`,
   `<meta property="og:description" content="Le combat façon Baldur's Gate 3 pour Foundry VTT et D&amp;D 2024. Gratuit et open source.">`],
  // Navigation
  ['<a href="#modules">Modules</a>', '<a href="#modules">Modules</a>'],
  ['<a href="#install">Install</a>', '<a href="#install">Installer</a>'],
  [`<a href="#made">How it's made</a>`, '<a href="#made">Comment c\'est fait</a>'],
  ['<a class="lang" href="fr/" hreflang="fr" lang="fr">FR</a>', '<a class="lang" href="../" hreflang="en" lang="en">EN</a>'],
  // Hero
  ['Foundry VTT V14 · dnd5e 6 · D&amp;D 2024 rules', 'Foundry VTT V14 · dnd5e 6 · règles D&amp;D 2024'],
  ['<h1>Full automation<br> <em>Out of the box</em></h1>', '<h1>Tout automatisé<br> <em>Dès l\'installation</em></h1>'],
  [`Baldur's Gate 3-style combat for Foundry: move along a path, attack from a click, react and roll your saves on your own screen. Every class and species of the 2024 Player's Handbook is automated. Free and open source.`,
   `Le combat façon Baldur's Gate 3 dans Foundry : on se déplace le long d'un chemin, on attaque d'un clic, on réagit et on lance ses jets de sauvegarde sur son propre écran. Toutes les classes et espèces du Manuel des joueurs 2024 sont automatisées. Gratuit et open source.`],
  ['Install in two minutes', 'Installer en deux minutes'],
  ['See it in action', 'Le voir en action'],
  ['modules, pick what you need', 'modules, prenez ce qu\'il vous faut'],
  ['<strong>1,400+</strong>automated tests', '<strong>1 400+</strong>tests automatiques'],
  ['<strong>$0</strong>no Patreon, nothing locked', '<strong>0 €</strong>pas de Patreon, rien de verrouillé'],
  ['aria-label="A fighter walks up to a goblin, attacks twice and kills it"', 'aria-label="Un guerrier s\'approche d\'un gobelin, attaque deux fois et le tue"'],
  // Automation, simplified
  ['Automation, simplified', 'L\'automatisation, en simple'],
  ['Six automation modules become one', 'Six modules d\'automatisation deviennent un seul'],
  ['One module owns the whole combat loop: attacks, saves, reactions, zones, auras, conditions. No load order to get right, no compatibility chart between six authors, no premade to import per spell.',
   'Un seul module gère toute la boucle de combat : attaques, sauvegardes, réactions, zones, auras, états. Plus d\'ordre de chargement à respecter, plus de compatibilités à vérifier entre six auteurs, plus d\'automatisation à importer sort par sort.'],
  // Modules
  ['<span class="eyebrow">The modules</span>', '<span class="eyebrow">Les modules</span>'],
  ['Only Core is required. Add the rest one by one.', 'Seul Core est obligatoire. Ajoutez le reste un par un.'],
  ['Every clip below is a real, uncut moment in Foundry. Click one to watch it full size. The full shorts, with sound, are on',
   'Chaque extrait ci-dessous est un vrai moment dans Foundry, sans coupe. Cliquez dessus pour le voir en grand. Les shorts complets, avec le son, sont sur'],
  ['<span class="tag">Required</span>', '<span class="tag">Obligatoire</span>'],
  ['The rules and combat engine. It owns the whole combat loop, so nothing fights over your clicks.',
   'Le moteur de règles et de combat. Il gère toute la boucle de combat : plus aucun module ne se dispute vos clics.'],
  ['Click the ground to move along a path, click an enemy to attack', 'Un clic au sol pour suivre un chemin, un clic sur un ennemi pour l\'attaquer'],
  ['Opportunity attacks resolved before the move', 'Les attaques d\'opportunité résolues avant le déplacement'],
  [`Reactions and saving throws on each player's own screen`, 'Réactions et jets de sauvegarde sur l\'écran de chaque joueur'],
  ['Lingering zones, concentration, conditions, auras', 'Zones persistantes, concentration, états, auras'],
  ['Vision and light rules: who sees whom, Search, passive Perception', 'Règles de vision et de lumière : qui voit qui, Fouille, Perception passive'],
  ['Needs Foundry V14 and dnd5e 6.0 or later. Patches neither Foundry nor the system.', 'Demande Foundry V14 et dnd5e 6.0 ou plus récent. Ne modifie ni Foundry ni le système.'],
  ['<span>Attack</span>Walk up and strike', '<span>Attaque</span>S\'approcher et frapper'],
  ['<span>Reaction</span>Opportunity attack', '<span>Réaction</span>Attaque d\'opportunité'],
  ['<span>Action</span>Disengage first', '<span>Action</span>Se désengager d\'abord'],
  ['<span>Reaction</span>Shield!', '<span>Réaction</span>Bouclier !'],
  ['<span>Saves</span>Fireball: roll your own save', '<span>Sauvegardes</span>Boule de feu : chacun son jet'],
  ['<span>Zone</span>Spirit Guardians', '<span>Zone</span>Esprits gardiens'],
  ['<span class="tag">Needs Core</span>', '<span class="tag">Demande Core</span>'],
  ['The screen you play from: an action bar along the bottom, party portraits on the side, the turn order across the top.',
   'L\'écran d\'où l\'on joue : une barre d\'actions en bas, les portraits du groupe sur le côté, l\'ordre des tours en haut.'],
  ['Actions grouped by tab, layout saved per character', 'Actions rangées par onglet, disposition gardée pour chaque personnage'],
  [`Pick a spell's level from a drawer`, 'Le niveau d\'un sort se choisit dans un tiroir'],
  ['Greyed-out actions tell you why', 'Une action grisée dit pourquoi'],
  ['Movement budget, Dash and the path shown before you commit', 'Budget de déplacement, Foncer, et le chemin affiché avant de valider'],
  ['<span>Interface</span>The bar and the strip', '<span>Interface</span>La barre et la frise'],
  ['<span>Movement</span>Path, budget, Dash', '<span>Déplacement</span>Chemin, budget, Foncer'],
  ['What happens after the fight: corpses to search, chests to pick, merchants to haggle with.',
   'Ce qui se passe après le combat : des corps à fouiller, des coffres à crocheter, des marchands avec qui marchander.'],
  ['Treasure rolled on the first search, by challenge rating', 'Trésor tiré à la première fouille, selon le facteur de puissance'],
  [`Locked containers: key, thieves' tools or the GM`, 'Contenants verrouillés : clé, outils de voleur ou MJ'],
  ['Pickpocketing, items thrown on the ground, raising the dead', 'Vol à la tire, objets jetés au sol, morts relevés'],
  ['Barter window with restocking merchants', 'Fenêtre de troc, marchands qui se réapprovisionnent'],
  ['<span>Loot</span>Search the body', '<span>Butin</span>Fouiller le corps'],
  ['<span>Container</span>The chest is locked', '<span>Contenant</span>Le coffre est verrouillé'],
  ['<span>Theft</span>Pickpocket', '<span>Vol</span>Vol à la tire'],
  ['<span>Ground</span>Throw your sword', '<span>Au sol</span>Jeter son épée'],
  ['<span>Necromancy</span>Rise', '<span>Nécromancie</span>Relève-toi'],
  ['<span>Merchant</span>Haggling', '<span>Marchand</span>Marchander'],
  ['<span class="tag">Standalone</span>', '<span class="tag">Autonome</span>'],
  ['Tokens that sit in the scene. Purely visual: it never writes anything to your world.',
   'Des jetons qui s\'ancrent dans la scène. Purement visuel : rien n\'est jamais écrit dans votre monde.'],
  ['Contact shadows, and shadows cast by lights and the sun', 'Ombres au sol, et ombres portées par les lumières et le soleil'],
  ['Flying creatures bob; higher tokens look larger', 'Les créatures volantes flottent ; plus un jeton est haut, plus il paraît grand'],
  ['Blur beyond darkvision range', 'Flou au-delà de la vision dans le noir'],
  ['<span>Light</span>Shadows and flight', '<span>Lumière</span>Ombres et vol'],
  ['In the dark: clip coming soon', 'Dans le noir : extrait à venir'],
  ['<span>Vision</span>Darkvision blur', '<span>Vision</span>Flou de vision dans le noir'],
  ['<span class="tag">Needs BLFX Premium</span>', '<span class="tag">Demande BLFX Premium</span>'],
  ['Boss Loot animations for the abilities Boss Loot does not recognise on its own, such as high-level spells. Your own custom animations are kept.',
   'Des animations Boss Loot pour les capacités que Boss Loot ne reconnaît pas seul, comme les sorts de haut niveau. Vos propres animations sont conservées.'],
  ['Boss Loot is a paid third-party module, not included.', 'Boss Loot est un module tiers payant, non inclus.'],
  ['<div class="soon">Clip coming soon</div><figcaption><span>Spell</span>High-level spell', '<div class="soon">Extrait à venir</div><figcaption><span>Sort</span>Sort de haut niveau'],
  ['Make your own automated spells, features and magic items step by step, without writing code.',
   'Créez vos propres sorts, aptitudes et objets magiques automatisés, pas à pas, sans écrire de code.'],
  ['<div class="soon">Clip coming soon</div><figcaption><span>Creator</span>Make a spell', '<div class="soon">Extrait à venir</div><figcaption><span>Créateur</span>Créer un sort'],
  // Install
  ['<span class="eyebrow">Install</span>', '<span class="eyebrow">Installer</span>'],
  ['Paste a link into Foundry', 'Coller un lien dans Foundry'],
  [`DAS is not listed in Foundry's package browser. Install it from these links: updates then arrive through Foundry's usual <em>Check for Updates</em>. The same links work on The Forge.`,
   'DAS ne figure pas dans le catalogue de Foundry. On l\'installe avec ces liens, puis les mises à jour arrivent par l\'habituel <em>Check for Updates</em> de Foundry. Les mêmes liens marchent sur The Forge.'],
  ['Install Core first', 'D\'abord, installer Core'],
  ['In Foundry, go to <em>Add-on Modules → Install Module</em>, paste the link at the bottom, then <em>Install</em>.',
   'Dans Foundry, ouvrez <em>Add-on Modules → Install Module</em>, collez le lien en bas, puis <em>Install</em>.'],
  ['<small>required</small>', '<small>obligatoire</small>'],
  ['Add the modules you want', 'Ajouter les modules voulus'],
  ['<small>needs Core</small>', '<small>demande Core</small>'],
  ['<small>standalone</small>', '<small>autonome</small>'],
  ['<small>needs BLFX Premium</small>', '<small>demande BLFX Premium</small>'],
  ['type="button">Copy</button>', 'type="button">Copier</button>'],
  ['Turn off what DAS replaces', 'Désactiver ce que DAS remplace'],
  ['<th>If you enable</th><th>Disable</th>', '<th>Si vous activez</th><th>Désactivez</th>'],
  ['Item Piles. A bundled macro converts your Item Piles merchants.', 'Item Piles. Une macro fournie convertit vos marchands Item Piles.'],
  ['<h3>Good to know</h3>', '<h3>Bon à savoir</h3>'],
  ['The interface is in English and French. Other languages can be added: each module has a translation file.',
   'L\'interface existe en anglais et en français. D\'autres langues peuvent être ajoutées : chaque module a un fichier de traduction.'],
  ['Core has three automation levels in its settings: Essentials, Assisted and Full.',
   'Core propose trois niveaux d\'automatisation dans ses réglages : Essentiel, Assisté et Complet.'],
  ['Back up your world before trying DAS on a campaign in progress.', 'Sauvegardez votre monde avant d\'essayer DAS sur une campagne en cours.'],
  [`Questions, bugs or ideas? Join the <a href="https://discord.gg/PDSq8dYdTP">Discord</a>, or open an issue on the module's GitHub page.`,
   'Une question, un bug, une idée ? Rejoignez le <a href="https://discord.gg/PDSq8dYdTP">Discord</a> (salon #francais), ou ouvrez une <em>issue</em> sur la page GitHub du module.'],
  // How it's made
  [`<span class="eyebrow">How it's made</span>`, '<span class="eyebrow">Comment c\'est fait</span>'],
  ['Written with an AI. Checked like it matters.', 'Écrit avec une IA. Vérifié avec soin.'],
  [`“I'm a game master, not a developer. DAS is written with the help of an AI, and here is what I do to make sure it holds up at the table.”`,
   '« Je suis MJ, pas développeur. DAS est écrit avec l\'aide d\'une IA, et voici ce que je fais pour qu\'il tienne la route à la table. »'],
  ['<strong>1,400+</strong><p>automated tests, run by GitHub on every change.</p>', '<strong>1 400+</strong><p>tests automatiques, lancés par GitHub à chaque modification.</p>'],
  ['<p>combat scenarios replayed inside Foundry.</p>', '<p>scénarios de combat rejoués dans Foundry.</p>'],
  ['<p>patches to Foundry or the dnd5e system. Public hooks only.</p>', '<p>modification de Foundry ou du système dnd5e. Uniquement les points d\'accroche publics.</p>'],
  ['<p>licence. Anyone can read, fork or take over the code.</p>', '<p>licence libre. Chacun peut lire, copier ou reprendre le code.</p>'],
  [`<strong>Weekly</strong><p>play at the author's own table, with public release notes.</p>`, '<strong>Chaque semaine</strong><p>joué à la table de l\'auteur, avec des notes de version publiques.</p>'],
  // Footer
  ['Ko-fi (optional, unlocks nothing)', 'Ko-fi (facultatif, ne débloque rien)'],
  ['>Report a bug</a>', '>Signaler un bug</a>'],
  ['Battle maps by Forgotten Adventures. Visual effects by Boss Loot (BLFX). This work includes material from the System Reference Document 5.2 by Wizards of the Coast LLC, licensed under CC BY 4.0. Not affiliated with or endorsed by Wizards of the Coast or Foundry Gaming.',
   'Cartes de Forgotten Adventures. Effets visuels de Boss Loot (BLFX). Cette œuvre contient du contenu du System Reference Document 5.2 de Wizards of the Coast LLC, sous licence CC BY 4.0. Sans lien avec Wizards of the Coast ni Foundry Gaming, qui ne la cautionnent pas.'],
  // Viewer and scripts
  ['aria-label="Clip, full size"', 'aria-label="Extrait en grand"'],
  ['aria-label="Previous clip"', 'aria-label="Extrait précédent"'],
  ['aria-label="Next clip"', 'aria-label="Extrait suivant"'],
  ['aria-label="Close"', 'aria-label="Fermer"'],
  ['btn.textContent = "Copied"', 'btn.textContent = "Copié"'],
  ['btn.textContent = "Copy"', 'btn.textContent = "Copier"'],
  ['btn.textContent = "Selected"', 'btn.textContent = "Sélectionné"'],
  // (the hero clip's caption in the viewer script is translated by the "Attack" figcaption line above)
];

const missing = [];
for ( const [en, fr] of T ) {
  if ( !html.includes(en) ) { missing.push(en); continue; }
  html = html.split(en).join(fr);
}
if ( missing.length ) {
  console.error("These English strings are no longer in index.html: update tools/build-fr.mjs\n- " + missing.join("\n- "));
  process.exit(1);
}

// The French page lives one folder down: relative paths to clips, images and the hero clip go up one level.
html = html.replace(/(src|data-src|poster|href)="(clips|img)\//g, '$1="../$2/')
  .replaceAll('"clips/short-01', '"../clips/short-01')
  .replace('<link rel="alternate" hreflang="en" href="https://darshyne.github.io/">', '<link rel="alternate" hreflang="en" href="https://darshyne.github.io/">');

fs.mkdirSync(path.join(root, "fr"), { recursive: true });
fs.writeFileSync(path.join(root, "fr", "index.html"), html);
console.log(`fr/index.html written (${T.length} strings translated).`);
