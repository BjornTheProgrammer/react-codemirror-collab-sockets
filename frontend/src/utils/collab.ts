import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view"
import { StateEffect, Text, ChangeSet } from "@codemirror/state"
import { Update, receiveUpdates, sendableUpdates, collab, getSyncedVersion } from "@codemirror/collab"
import { Socket } from "socket.io-client"
import { cursor, addCursor } from "./cursors" 

function pushUpdates(
	socket: Socket,
	docName: string,
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
		socket.emit('pushUpdates', docName, version, JSON.stringify(updates));

		socket.once('pushUpdateResponse', function(status: boolean) {
			resolve(status);
		});
	});
}

function pullUpdates(
	socket: Socket,
	docName: string,
	version: number
): Promise<readonly Update[]> {

	return new Promise(function(resolve) {
		socket.emit('pullUpdates', docName, version);

		socket.once('pullUpdateResponse', function(updates: any) {
			resolve(JSON.parse(updates));
		});
	}).then((updates: any) => updates.map((u: any) => {
		if (u.effects[0]) {
			let effects: StateEffect<any>[] = [];

			u.effects.forEach((effect: StateEffect<any>) => {
				if (effect.value?.id) {
					let cursor: cursor = {
						id: effect.value.id,
						from: effect.value.from,
						to: effect.value.to
					}

					effects.push(addCursor.of(cursor))
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

export function getDocument(socket: Socket, docName: string): Promise<{version: number, doc: Text}> {
	return new Promise(function(resolve) {
		socket.emit('getDocument', docName);

		socket.once('getDocumentResponse', function(version: number, doc: string) {
			resolve({
				version,
				doc: Text.of(doc.split("\n"))
			});
		});
	});
}

export const peerExtension = (socket: Socket, docName: string, startVersion: number, id: string) => {
	let plugin = ViewPlugin.fromClass(class {
		private pushing = false
		private done = false

		constructor(private view: EditorView) { this.pull() }

		update(update: ViewUpdate) {
			if (update.docChanged || update.transactions[0]?.effects[0]) this.push()
		}

		async push() {
			let updates = sendableUpdates(this.view.state);
			if (this.pushing || !updates.length) return;
			this.pushing = true;
			let version = getSyncedVersion(this.view.state);
			await pushUpdates(socket, docName, version, updates);
			this.pushing = false;
			// Regardless of whether the push failed or new updates came in
			// while it was running, try again if there's updates remaining
			if (sendableUpdates(this.view.state).length)
				setTimeout(() => this.push(), 100);
		}

		async pull() {
			while (!this.done) {
				let version = getSyncedVersion(this.view.state)
				let updates = await pullUpdates(socket, docName, version)
				let newUpdates = receiveUpdates(this.view.state, updates)
				this.view.dispatch(newUpdates)
			}
		}

		destroy() { this.done = true }
	})

	return [
		collab({
			startVersion,
			clientID: id,
			sharedEffects: tr => {
				const effects = tr.effects.filter(e => {
					return e.is(addCursor);
				})

				return effects;
			}
		}),
		plugin
	]
}
