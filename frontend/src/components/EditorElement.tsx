import React, { Component } from "react";

import CodeMirror from '@uiw/react-codemirror';
import { langs } from '@uiw/codemirror-extensions-langs';
import { basicSetup } from '@uiw/codemirror-extensions-basic-setup';
import { indentUnit } from '@codemirror/language'
import { EditorView } from "@codemirror/view"

import { cursor, addCursor, cursorExtension } from "../utils/cursors";

import { io } from "socket.io-client";

import { peerExtension, getDocument } from "../utils/collab";
import { generateName } from "../utils/usernames";

const socket = io("http://localhost:8000", {
	path: "/api"
});

type state = {
	connected: boolean,
	version: number | null,
	doc: String | null
}

const username = generateName();

class EditorElement extends React.Component<{}, state> {

	state = {
		connected: false,
		version: null,
		doc: null
	}

	componentDidMount(): void {
		getDocument(socket).then(({version, doc}) => {
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
							peerExtension(socket, this.state.version, username),
							cursorExtension(username)
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