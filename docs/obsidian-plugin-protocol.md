# Obsidian plugin protocol

The website is a static SPA hosted at `https://mordechaihadad.github.io/timeline-creator/`. The Obsidian plugin embeds it in an iframe, binds each view to one `.timeline` file, and relays the file content over `postMessage`. The website never gets vault access.

## Embed URL

```
https://mordechaihadad.github.io/timeline-creator/?embed=obsidian&token=<random>
```

- `embed=obsidian` makes the site use the host bridge instead of localStorage.
- `token` is generated per view and must be echoed on every message.

For local development, use `http://localhost:5173/?embed=obsidian&token=<random>`.

## Messages

All messages are plain objects with `v: 1`.

### Site to host

`ready`

```json
{ "v": 1, "type": "ready", "token": "..." }
```

Sent on load and retried every 500 ms until the host answers.

`save`

```json
{
	"v": 1,
	"type": "save",
	"token": "...",
	"requestId": "...",
	"content": "...",
	"baseRevision": "..."
}
```

`content` is the full `.timeline` file. `baseRevision` is the revision received with `open` or the last `saved` / `external-change`.

### Host to site

`open`

```json
{
	"v": 1,
	"type": "open",
	"token": "...",
	"content": "...",
	"revision": "...",
	"fileName": "My Timeline.timeline"
}
```

Sent after `ready` and after an iframe reload. `content` may be an empty string for an empty file.

`saved`

```json
{ "v": 1, "type": "saved", "token": "...", "requestId": "...", "revision": "..." }
```

`save-error`

```json
{ "v": 1, "type": "save-error", "token": "...", "requestId": "...", "message": "..." }
```

`external-change`

```json
{ "v": 1, "type": "external-change", "token": "...", "content": "...", "revision": "..." }
```

Sent when the vault file is modified outside the plugin. The site reloads it when it has no unsaved changes and shows a conflict banner otherwise.

`conflict`

```json
{
	"v": 1,
	"type": "conflict",
	"token": "...",
	"requestId": "...",
	"content": "...",
	"revision": "..."
}
```

Sent instead of `saved` when the file changed since `baseRevision`.

## New file template

When the plugin creates a `.timeline` file, write this and then send it through `open`. The site also treats an empty string as an empty timeline.

```json
{
	"format": "timeline",
	"version": 1,
	"title": "Untitled Timeline",
	"timeConfig": { "name": "Gregorian", "epoch": 0, "scale": 1, "precision": "date" },
	"events": [],
	"periods": []
}
```

## Host rules

- Validate `event.origin` is the site origin (or `http://localhost:5173` in dev) and `event.source === iframe.contentWindow`.
- Scope every message to the single file bound to the view. Never accept paths or commands from the site.
- On `save`, re-read the file. If its revision differs from `baseRevision`, reply `conflict` with the current content and revision. Otherwise write and reply `saved` with the new revision.
- Serialize writes through one queue per view.
- Ignore your own `vault.on('modify')` events and send `external-change` for the rest.
- Reuse an existing leaf when the same file is opened again.
- Attach the `message` listener to the window that owns the iframe (`iframe.ownerDocument.defaultView`), because Obsidian can move views into a popout window.
- Add an "Open as text" command so users can recover a file by hand.

## Plugin sketch

```ts
registerExtensions(['timeline'], VIEW_TYPE);
registerView(VIEW_TYPE, (leaf) => new TimelineView(leaf, this));

class TimelineView extends ItemView {
	private frame!: HTMLIFrameElement;
	private token = crypto.randomUUID();
	private content = '';
	private revision = '';

	async onOpen() {
		this.frame = this.contentEl.createEl('iframe', { cls: 'timeline-frame' });
		const owner = this.frame.ownerDocument.defaultView ?? window;
		owner.addEventListener('message', this.handleMessage);
		this.frame.src = `${SITE_URL}?embed=obsidian&token=${this.token}`;
	}

	async onLoadFile(file: TFile) {
		this.content = await this.app.vault.read(file);
		this.revision = String(file.stat.mtime);
		this.sendOpen();
	}

	private handleMessage = (event: MessageEvent) => {
		if (event.source !== this.frame.contentWindow) return;
		if (event.data?.token !== this.token) return;
		if (event.data.type === 'ready') this.sendOpen();
		if (event.data.type === 'save') void this.save(event.data);
	};
}
```

`save` checks the current mtime against `baseRevision`, then calls `vault.modify`. The details are in the message list above.

## Failure states

- Invalid or newer-version file: the site shows an error view and does not autosave.
- Empty file: the site shows an empty timeline.
- No host response: the site shows "Open this from Obsidian" after 15 seconds.
- Save failure: banner with Retry.
- Conflict: banner with Reload file / Keep mine.
