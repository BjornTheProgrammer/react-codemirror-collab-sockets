import { Component } from "react";

import CodeMirror from '@uiw/react-codemirror';
import { langs } from '@uiw/codemirror-extensions-langs';
import { basicSetup } from '@uiw/codemirror-extensions-basic-setup';
import { indentUnit } from '@codemirror/language'
import { getClientID } from "@codemirror/collab"
import { EditorView } from "@codemirror/view"

import { cursor, addCursor, cursorExtension } from "../utils/cursors";
import { generateName } from "../utils/usernames"
import { getDocument, peerExtension } from "../utils/collab"
import { Socket } from "socket.io-client";

type state = {
	connected: boolean,
	version: number | null,
	documentName: string,
	doc: null | String
}

type props = {
	socket: Socket
}

let editorKey = 0;

class EditorElement extends Component<props, state> {

	state = {
		connected: false,
		version: null,
		doc: null,
		documentName: '',
		username: generateName()
	}

	async componentDidMount() {
		const { version, doc } = await getDocument(this.props.socket, this.state.documentName);

		this.setState({
			version,
			doc: doc.toString()
		})

		this.props.socket.on('connect', () => {
			this.setState({
				connected: true
			});
		});

		this.props.socket.on('disconnect', () => {
			this.setState({ 
				connected: false
			});
		});

		this.props.socket.on('display', async (documentName) => {
			const { version, doc } = await getDocument(this.props.socket, documentName)

			this.setState({
				version,
				doc: doc.toString(),
				documentName
			})
		});
	}

	componentWillUnmount(): void {
		this.props.socket.off('connect');
		this.props.socket.off('disconnect');
		this.props.socket.off('display');
		this.props.socket.off('pullUpdateResponse');
		this.props.socket.off('pushUpdateResponse');
		this.props.socket.off('getDocumentResponse');
	}


	render() {
		editorKey++;

		if (this.state.version !== null && this.state.doc !== null) {
			return (
				<CodeMirror
					key={editorKey}
					className="flex-1 overflow-scroll"
					height="100%"
					basicSetup={false}
					extensions={[
						indentUnit.of("\t"),
						basicSetup(), 
						langs.c(),
						peerExtension(this.props.socket, this.state.documentName, this.state.version, this.state.username),
						cursorExtension(this.state.username)
					]}
					value={this.state.doc}
				/>
			);
		} else {
			return (
				<p>loading...</p>
			);
		}
	}
}

export default EditorElement;
