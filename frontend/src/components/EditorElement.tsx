import { Component } from "react";

import CodeMirror from '@uiw/react-codemirror';
import { langs } from '@uiw/codemirror-extensions-langs';
import { basicSetup } from '@uiw/codemirror-extensions-basic-setup';
import { indentUnit } from '@codemirror/language'

import { cursorExtension } from "../utils/cursors";
import { generateName } from "../utils/usernames"
import { getDocument, peerExtension } from "../utils/collab"
import { Socket } from "socket.io-client";

type Mode = 'light' | 'dark';

type state = {
	connected: boolean,
	version: number | null,
	documentName: string,
	doc: null | string,
	mode:  Mode
}

type props = {
	socket: Socket,
	className?: string
}

let editorKey = 0;

class EditorElement extends Component<props, state> {

	state = {
		connected: false,
		version: null,
		doc: null,
		documentName: 'default-doc',
		username: generateName(),
		mode: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' as Mode
	}

	async componentDidMount() {
		console.log('mounting')
		const { version, doc } = await getDocument(this.props.socket, this.state.documentName);
		console.log('version-doc: ', version, doc);

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
			console.log('display')
			const { version, doc } = await getDocument(this.props.socket, documentName)

			this.setState({
				version,
				doc: doc.toString(),
				documentName
			})
		});

		// Change to dark mode or light mode depending on settings.
		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
			const mode = event.matches ? "dark" : "light";
			this.setState({
				mode
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
					className={`flex-1 overflow-scroll text-left ${this.props.className}`}
					height="100%"
					basicSetup={false}
					theme={ this.state.mode }
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
