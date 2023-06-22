import EditorElement from './components/EditorElement';

import { io } from "socket.io-client";

const socket = io("http://localhost:8000", {
  path: "/api"
});

function App() {
  return (
    <>
      <h1>Collaberative Codemirror React</h1>
      <div className="card space-x-3">
        <p className='mb-3'>
          Edit the document below to test collab editing
        </p>
        <button onClick={() => socket.emit('edit', 'collab.js')}>collab.js</button>
        <button onClick={() => socket.emit('edit', 'random.c')}>random.c</button>
        <button onClick={() => socket.emit('edit', 'final_example.txt')}>final_example.txt</button>
      </div>
      <EditorElement socket={socket}  />
    </>
  )
}

export default App
