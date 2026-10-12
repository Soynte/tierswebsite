# CombatAdvanced Tiers

The server's tier list website, in the style of MCTiers. It has an overall
ranking by points, a tier list for every mode, a Hall of Fame, player
profiles, a search box, and an editor where you add any player, set their
tiers and induct people into the Hall of Fame.

It is a plain static site: no server, no database, no build step. GitHub
Pages hosts it for free.

## The files

| File | What it is |
|---|---|
| `index.html`, `styles.css`, `app.js` | the site itself |
| `editor.js` | the editor, at `#/edit` |
| `data/players.json` | **the players and their tiers** (the editor writes this) |
| `data/halloffame.json` | **the Hall of Fame** (the editor writes this too) |
| `data/config.json` | the site's settings: modes, points, titles, region colours, server IP, Discord link |
| `fonts/` | the Barlow and Barlow Condensed fonts (SIL Open Font License, `fonts/OFL.txt`) |
| `favicon.svg` | the tab icon |

## Put it online with GitHub Pages (free)

GitHub Pages is free for **public** repositories. Nothing in these files is
secret, so a public repository is fine. Do not put the site in a private mod
repository and make that public.

1. Go to <https://github.com/new>. Name the repository `tiers`, choose
   **Public**, and press **Create repository**.
2. On the new repository's page, click **uploading an existing file**.
3. Drag in **everything inside this folder** (`index.html`, `app.js`,
   `editor.js`, `styles.css`, `favicon.svg`, `README.md`, and the `data` and
   `fonts` folders). Drag what is *inside* the folder, not the folder itself.
   Then press **Commit changes**.
4. Open **Settings → Pages**. Under **Build and deployment**, set **Source** to
   *Deploy from a branch*, and **Branch** to `main` and `/ (root)`. Press
   **Save**.
5. Wait a minute or two, then refresh that page. It shows the address:
   **`https://soynte.github.io/tiers/`**.

Any change you commit to the repository is online a minute or two later.
You never have to touch Settings again.

## Adding players and setting tiers

### With the editor (easiest)

Open **`https://soynte.github.io/tiers/#/edit`** (bookmark it; it is not
linked from the site).

- Type a Minecraft name and press **Add player**.
- Pick a tier in each mode. Leave a mode on **—** for no tier.
- Optionally pick a region. The trash button removes a player.
- The **Hall of Fame** tab works the same way: type a name, press **Add**,
  then fill in what they are known for, a category, the year and a sentence
  or two. Tick **Featured** to give them a big card at the top of the page.
- Press **Save**. It saves both lists at once.

The first time you save, it asks for a **GitHub token**: a key that lets the
editor change this one repository. Make it once:

1. Open <https://github.com/settings/personal-access-tokens/new>. That is
   **Settings → Developer settings → Personal access tokens → Fine-grained
   tokens → Generate new token**.
2. Give it a name, like *tier editor*, and pick an **Expiration** from the
   list, such as 90 days. If you choose *Custom*, you must also pick a date,
   or GitHub silently refuses to make the token.
3. **Repository access:** *Only select repositories*, and pick `tiers`.
4. **Permissions:** add **Contents** and set it to **Read and write**.
5. Press **Generate token** and copy it. It starts with `github_pat_`.
6. Paste it into the editor and press **Connect**.

The token stays in your browser, and the editor only ever sends it to GitHub.
Do not share it or paste it anywhere else. If it leaks, delete it on the same
GitHub page and make a new one.

Everyone can open the editor page, but only someone with a token for this
repository can save. Without a token, **Download** gives you the new
`players.json`. You can then upload it into the `data` folder on GitHub yourself.

### By hand

Open `data/players.json` on GitHub, press the pencil icon, edit it, and press
**Commit changes**:

```json
{
  "players": [
    {
      "name": "Soynte",
      "region": "EU",
      "tiers": {
        "classic": "HT1",
        "uhc": "LT2"
      }
    }
  ]
}
```

- `name` is the Minecraft name. The skin comes from it.
- `tiers` maps each mode id from `config.json` to `HT1`, `LT1`, ... `HT5`,
  `LT5`. Leave out a mode for no tier.
- `region` is optional: `NA`, `EU`, `SA`, `AS`, `AU`, `ME` or `AF`.
- `uuid` is optional too. If a player changes their name, their UUID keeps
  their skin working.

If the file has a mistake, such as a missing comma, the site says which line
it is on.

`data/halloffame.json` looks like this:

```json
{
  "inductees": [
    {
      "name": "Soynte",
      "category": "staff",
      "year": 2026,
      "title": "Founder",
      "text": "Started CombatAdvanced and built most of what runs on it.",
      "featured": true
    }
  ]
}
```

`category` is one of the ids under `hallOfFame` in `config.json`. Featured
inductees get the big cards; with none featured, the newest three do.

## Changing the site (`data/config.json`)

| Key | What it does |
|---|---|
| `siteName`, `serverName` | the tab title and the name at the top left |
| `serverIp`, `discord` | the copy-IP button and the Discord button |
| `modes` | the mode tabs, in order: `id` (used in players.json), `name`, `icon` |
| `points` | what each tier is worth, **best tier first**. Add `"MT1": 50` and so on for mid tiers. |
| `titles` | the title for each points total, with its colour |
| `regions` | the region codes and their colours |
| `hallOfFame` | the line under the Hall of Fame heading, and its categories with their colours |
| `skins` | where skins come from (`{name}` is the player's name); `body` is the full-body picture on Hall of Fame cards |
| `github` | where the editor saves. Leave owner and repo empty on `github.io`, since it works them out from the address; `dir` is the data folder. |

Built-in mode icons: `classic`, `sword`, `trident`, `pot`, `uhc`, `shield`,
`smp`. For any other mode, upload a small picture to the repository and set
`icon` to its path, like `"icons/mace.png"`.

**Points** (like MCTiers): HT1 60, LT1 45, HT2 30, LT2 20, HT3 10, LT3 6,
HT4 4, LT4 3, HT5 2, LT5 1. The overall ranking adds up every mode, and equal
points go to the better single tier.

## Your own address (optional)

To use `tiers.combatadvanced.com` instead of `soynte.github.io/tiers`:

1. In **Settings → Pages → Custom domain**, enter `tiers.combatadvanced.com`
   and save.
2. Where the domain's DNS is managed, add a **CNAME** record: name `tiers`,
   value `soynte.github.io`.
3. Once GitHub has checked it, tick **Enforce HTTPS**.

On your own domain the editor cannot work out the repository from the
address. Type the owner (`soynte`) and repository (`tiers`) in the editor's
connect box once, or set them under `github` in `config.json`.

## Trying it on your computer

Double-clicking `index.html` does not work, because browsers do not let a page
read its data files off your disk. Run a small web server in this folder
instead, such as `npx serve` or `python -m http.server`, and open the address
it prints.
