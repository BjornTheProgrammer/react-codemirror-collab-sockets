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
      </div>
      <EditorElement socket={socket}  />
    </>
  )
}

export default App
