import React, { Component } from "react";

import CodeMirror from '@uiw/react-codemirror';
import { langs } from '@uiw/codemirror-extensions-langs';
import { basicSetup } from '@uiw/codemirror-extensions-basic-setup';
import { indentUnit } from '@codemirror/language'
import {Update, receiveUpdates, sendableUpdates, collab, getSyncedVersion} from "@codemirror/collab"
import {ChangeSet, EditorState, Text} from "@codemirror/state"
import {EditorView, ViewPlugin, ViewUpdate} from "@codemirror/view"

import { io } from "socket.io-client";

const socket = io("http://localhost:8000", {
	path: "/api"
});

type state = {
	connected: boolean,
	version: number | null,
	doc: String | null
}

class EditorElement extends React.Component<{}, state> {

	state = {
		connected: false,
		version: null,
		doc: null
	}

	componentDidMount(): void {
		this.getDocument().then(({version, doc}) => {
			this.setState({
				version,
				doc: doc.toString()
			});
		});

		socket.on('connect', () => {
			this.setState({
				connected: true
			});
		});

		socket.on('disconnect', () => {
			this.setState({ 
				connected: false
			});
		});
	}

	componentWillUnmount(): void {
		socket.off('connect');
		socket.off('disconnect');
		socket.off('pullUpdateResponse');
		socket.off('pushUpdateResponse');
		socket.off('getDocumentResponse');
	}

	pushUpdates(
		version: number,
		fullUpdates: readonly Update[]
	): Promise<boolean> {
		// Strip off transaction data
		let updates = fullUpdates.map(u => ({
			clientID: u.clientID,
			changes: u.changes.toJSON()
		}))

		return new Promise(function(resolve) {
			socket.emit('pushUpdates', version, JSON.stringify(updates));

			socket.once('pushUpdateResponse', function(status: boolean) {
				resolve(status);
			});
		});
	}

	pullUpdates(
		version: number
	): Promise<readonly Update[]> {
		return new Promise(function(resolve) {
			socket.emit('pullUpdates', version);

			socket.once('pullUpdateResponse', function(updates: any) {
				resolve(JSON.parse(updates));
			});
		}).then((updates: any) => updates.map((u: any) => ({
			changes: ChangeSet.fromJSON(u.changes),
			clientID: u.clientID
		})));
	}

	getDocument(): Promise<{version: number, doc: Text}> {
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

	peerExtension(startVersion: number) {
		let self = this;

		let plugin = ViewPlugin.fromClass(class {
			private pushing = false
			private done = false

			constructor(private view: EditorView) { this.pull() }

			update(update: ViewUpdate) {
				if (update.docChanged) this.push()
			}

			async push() {
				let updates = sendableUpdates(this.view.state)
				if (this.pushing || !updates.length) return
				this.pushing = true
				let version = getSyncedVersion(this.view.state)
				let success = await self.pushUpdates(version, updates)
				this.pushing = false
				// Regardless of whether the push failed or new updates came in
				// while it was running, try again if there's updates remaining
				if (sendableUpdates(this.view.state).length)
					setTimeout(() => this.push(), 100)
			}

			async pull() {
				while (!this.done) {
					let version = getSyncedVersion(this.view.state)
					let updates = await self.pullUpdates(version)
					this.view.dispatch(receiveUpdates(this.view.state, updates))
				}
			}

			destroy() { this.done = true }
		})
		return [collab({startVersion}), plugin]
	}


	render() {
		if (this.state.version !== null && this.state.doc !== null) {
			return (
				<>
					<CodeMirror
						className="flex-1 overflow-scroll"
						height="100%"
						basicSetup={false}
						id="codeEditor"
						extensions={[
							indentUnit.of("\t"), 
							basicSetup(), 
							langs.c(),
							this.peerExtension(this.state.version)
						]}
						value={this.state.doc}
					/>
				</>
			);
		} else {
			return (
				<span>loading...</span>
			)
		}
	}
}

export default EditorElement;