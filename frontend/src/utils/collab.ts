import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view"
import { StateEffect, Text, ChangeSet } from "@codemirror/state"
import { Update, receiveUpdates, sendableUpdates, collab, getSyncedVersion } from "@codemirror/collab"
import { Socket } from "socket.io-client"
import { cursor, addCursor, removeCursor } from "./cursors" 

function pushUpdates(
	socket: Socket,
	version: number,
	fullUpdates: readonly Update[]
): Promise<boolean> {
	// Strip off transaction data
	let updates = fullUpdates.map(u => ({
		clientID: u.clientID,
		changes: u.changes.toJSON(),
		effects: u.effects
	}))

	return new Promise(function(resolve) {
		socket.emit('pushUpdates', version, JSON.stringify(updates));

		socket.once('pushUpdateResponse', function(status: boolean) {
			resolve(status);
		});
	});
}

function pullUpdates(
	socket: Socket,
	version: number
): Promise<readonly Update[]> {
	return new Promise(function(resolve) {
		socket.emit('pullUpdates', version);

		socket.once('pullUpdateResponse', function(updates: any) {
			resolve(JSON.parse(updates));
		});
	}).then((updates: any) => updates.map((u: any) => {
		if (u.effects[0]) {
			let effects: StateEffect<any>[] = [];

			u.effects.forEach((effect: StateEffect<any>) => {
				if (effect.value?.id && effect.value?.from) {
					let cursor: cursor = {
						id: effect.value.id,
						from: effect.value.from,
						to: effect.value.to
					}

					effects.push(addCursor.of(cursor))
				} else if (effect.value?.id) {
					let cursorId = effect.value.id;

					effects.push(removeCursor.of(cursorId));
				}
			})

			return {
				changes: ChangeSet.fromJSON(u.changes),
				clientID: u.clientID,
				effects
			}
		}
		
		return {
			changes: ChangeSet.fromJSON(u.changes),
			clientID: u.clientID
		}
	}));
}

export function getDocument(socket: Socket): Promise<{version: number, doc: Text}> {
	return new Promise(function(resolve) {
		socket.emit('getDocument');

		socket.once('getDocumentResponse', function(version: number, doc: string) {
			resolve({
				version,
				doc: Text.of(doc.split("\n"))
			});
		});
	});
}

export const peerExtension = (socket: Socket, startVersion: number, id: string) => {
	let self = this;

	let plugin = ViewPlugin.fromClass(class {
		private pushing = false
		private done = false

		constructor(private view: EditorView) { this.pull() }

		update(update: ViewUpdate) {
			if (update.docChanged || update.transactions.length) this.push()
		}

		async push() {
			let updates = sendableUpdates(this.view.state)
			if (this.pushing || !updates.length) return
			this.pushing = true
			let version = getSyncedVersion(this.view.state)
			let success = await pushUpdates(socket, version, updates)
			this.pushing = false
			// Regardless of whether the push failed or new updates came in
			// while it was running, try again if there's updates remaining
			if (sendableUpdates(this.view.state).length)
				setTimeout(() => this.push(), 100)
		}

		async pull() {
			while (!this.done) {
				let version = getSyncedVersion(this.view.state)
				let updates = await pullUpdates(socket, version)
				this.view.dispatch(receiveUpdates(this.view.state, updates))
			}
		}

		destroy() { this.done = true }
	})

	
	return [
		collab(
			{
				startVersion,
				clientID: id,
				sharedEffects: tr => {
					const effects = tr.effects.filter(e => {
						return e.is(addCursor) || e.is(removeCursor);
					})

					return effects;
				}
			}
		),
		plugin
	]
}
