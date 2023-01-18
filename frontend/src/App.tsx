import React from 'react';
import EditorElement from './components/EditorElement';

import { io } from "socket.io-client";

const socket = io("http://localhost:8000", {
	path: "/api"
});

class App extends React.Component {
	render() {
		return (
			<>
				<h1>Collaberative Codemirror React</h1>
				<button onClick={() => socket.emit('edit', 'collab.js')}>collab.js</button>
				<button onClick={() => socket.emit('edit', 'random.c')}>random.c</button>
				<button onClick={() => socket.emit('edit', 'final_example.txt')}>final_example.txt</button>
				<EditorElement socket={socket}  />
			</>
		);
	}
}

export default App;
