import { Server, Socket } from 'socket.io';
import { spawn } from 'child_process';
import * as http from 'http';
import {ChangeSet, Text} from "@codemirror/state"
import {Update} from "@codemirror/collab"

const server = http.createServer();

interface document {
	updates: Update[],
	doc: Text,
	pending: ((value: any) => void)[],
}

let documents = new Map<string, document>();
documents.set('', {
	updates: [],
	pending: [],
	doc: Text.of(['\n\n\nStarting doc!\n\n\n'])
})

let io = new Server(server, {
	path: "/api",
	cors: {
		origin: "*",
		methods: ["GET", "POST"]
	}
});

function getDocument(name: string) {
	if (documents.has(name)) return documents.get(name);

	const documentContent: document = {
		updates: [],
		pending: [],
		doc: Text.of([`\n\n\nHello World from ${name}\n\n\n`])
	};

	documents.set(name, documentContent);

	return documentContent;
}

// listening for connections from clients
io.on('connection', (socket: Socket) =>{

	socket.on('pullUpdates', (documentName, version: number) => {
		try {
			const { updates, pending, doc } = getDocument(documentName);

			if (version < updates.length) {
				socket.emit("pullUpdateResponse", JSON.stringify(updates.slice(version)))
			} else {
				pending.push((updates) => { socket.emit('pullUpdateResponse', JSON.stringify(updates.slice(version))) });
				documents.set(documentName, {updates, pending, doc})
			}
		} catch (error) {
			console.error('pullUpdates', error);
		}
	})

	socket.on('pushUpdates', (documentName, version, docUpdates) => {
		try {
			let { updates, pending, doc } = getDocument(documentName);
			docUpdates = JSON.parse(docUpdates);

			if (version != updates.length) {
				socket.emit('pushUpdateResponse', false);
			} else {
				for (let update of docUpdates) {
					// Convert the JSON representation to an actual ChangeSet
					// instance
					let changes = ChangeSet.fromJSON(update.changes)
					updates.push({ changes, clientID: update.clientID, effects: update.effects })
					documents.set(documentName, {updates, pending, doc})
					doc = changes.apply(doc)
					documents.set(documentName, {updates, pending, doc})
				}
				socket.emit('pushUpdateResponse', true);

				while (pending.length) pending.pop()!(updates)
				documents.set(documentName, {updates, pending, doc})
			}
		} catch (error) {
			console.error('pushUpdates', error)
		}
	})

	socket.on('getDocument', (documentName) => {
		try {
			let { updates, doc } = getDocument(documentName);
			socket.emit('getDocumentResponse', updates.length, doc.toString());
		} catch (error) {
			console.error('getDocument', error);
		}
	})

	socket.on('edit', (params) => {
		socket.emit('display', params);
	})
})


const port = process.env.PORT || 8000;
server.listen(port, () => console.log(`Server listening on port: ${port}`));

